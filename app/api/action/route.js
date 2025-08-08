import { NextResponse } from "next/server";
import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import ScheduledJob from "@/models/schedule";
import ArchivedJob from "@/models/archivedJob";
import Variant from "@/models/variant";
import { revalidateTag } from "next/cache";
import ZaloAccount from "@/models/zalo";
import {
  logExecuteScheduleTask,
  logAutoCancelTask,
  logAutoCancelTaskForZaloFailure,
} from "@/app/actions/historyActions";
import mongoose from "mongoose";
import { revalidateAndBroadcast } from "@/lib/revalidation";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const OPTIONS = () => new NextResponse(null, { headers: cors });

/**
 * Sinh tin nhắn cuối cùng từ template và các biến thể trong DB.
 */
const generateFinalMessage = (messageTemplate, variants) => {
  if (!messageTemplate || !variants || !variants.length) {
    return messageTemplate;
  }
  let finalMessage = messageTemplate;
  const placeholders = messageTemplate.match(/{\w+}/g) || [];

  for (const placeholder of placeholders) {
    const variantName = placeholder.slice(1, -1).toLowerCase();
    const variant = variants.find((v) => v.name === variantName);
    if (variant && variant.words.length > 0) {
      const randomWord =
        variant.words[Math.floor(Math.random() * variant.words.length)];
      finalMessage = finalMessage.replace(placeholder, randomWord);
    }
  }
  return finalMessage;
};

/**
 * Gửi yêu cầu đến script bên ngoài.
 */
const executeExternalScript = async (type, acc, person, cfg, variants) => {
  let finalMessage = null;
  if (type === "sendMessage" && cfg.messageTemplate) {
    finalMessage = generateFinalMessage(cfg.messageTemplate, variants);
  }
  if (!acc || !acc.action) {
    throw new Error(
      `Tài khoản Zalo ${acc?.name || ""} chưa được cấu hình script action.`,
    );
  }
  const response = await fetch(acc.action, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      uid: acc.uid,
      phone: person.phone,
      uidPerson: person.uid || null,
      actionType: type,
      message: finalMessage || "",
    }),
    cache: "no-store",
  });

  const jsonResponse = await response.json();
  if (!response.ok || jsonResponse.status === "error") {
    throw new Error(jsonResponse.message || "Lỗi không xác định từ script");
  }
  return { finalMessage, scriptResult: jsonResponse.data };
};

/**
 * Cập nhật dữ liệu cho Customer sau khi task được thực thi.
 */
const updateDataAfterExecution = async ({
  actionType,
  apiResult,
  customerId,
}) => {
  const customer = await Customer.findById(customerId).select("uid").lean();
  if (!customer) return;

  const updatePayload = {};
  const { uidStatus, targetUid, actionMessage, actionStatus } = apiResult;

  if (actionType === "findUid" || (actionType === "sendMessage" && uidStatus)) {
    if (uidStatus === "found_new" && targetUid) {
      updatePayload.uid = targetUid;
    } else if (uidStatus === "provided" && actionStatus === "error") {
      updatePayload.uid = null;
    } else if (uidStatus === "not_found") {
      if (actionMessage && actionMessage.includes("quá nhiều lần")) {
        if (!customer.uid || !/^\d+$/.test(customer.uid)) {
          updatePayload.uid = null;
        }
      } else {
        updatePayload.uid = actionMessage || "Lỗi không xác định";
      }
    } else if (actionType === "findUid" && actionStatus === "error") {
      updatePayload.uid = actionMessage || "Lỗi thực thi script";
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    await Customer.updateOne({ _id: customerId }, { $set: updatePayload });
  }
};

/**
 * Lưu trữ, dọn dẹp và xóa một Job đã hoàn thành.
 * @param {object} jobToFinish - Document của job sắp hoàn thành.
 * @param {'completed' | 'failed'} finalStatus - Trạng thái cuối cùng của job.
 */
// ** MODIFIED: Thêm tham số finalStatus
const archiveAndCleanupJob = async (
  completedJob,
  finalStatus = "completed",
) => {
  if (!completedJob) return;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const customerIdsInJob = (completedJob.tasks || []).map(
      (task) => new mongoose.Types.ObjectId(task.person._id),
    );

    if (customerIdsInJob.length > 0) {
      await Customer.updateMany(
        { _id: { $in: customerIdsInJob } },
        { $pull: { action: { job: completedJob._id } } },
        { session },
      );
    }

    // Bước 2: Lưu trữ job
    const archiveData = {
      ...completedJob.toObject(),
      _id: completedJob._id,
      // ** MODIFIED: Sử dụng trạng thái cuối cùng được truyền vào
      status: finalStatus,
      completedAt: new Date(),
    };
    delete archiveData.tasks;
    await ArchivedJob.create([archiveData], { session });
    await ScheduledJob.findByIdAndDelete(completedJob._id, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error(
      `[ARCHIVE FAILED] Lỗi khi lưu trữ Job ${completedJob._id}:`,
      error,
    );
  } finally {
    session.endSession();
  }
};

export const GET = async () => {
  try {
    await connectDB();
    const now = new Date();

    // ++ ADDED: BƯỚC 1 - CƠ CHẾ TỰ CHỮA LỖI (SELF-HEALING)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const timedOutJobs = await ScheduledJob.find({
      "tasks.status": "processing",
      "tasks.processedAt": { $lt: fiveMinutesAgo },
    });

    for (const job of timedOutJobs) {
      const tasksToFail = job.tasks.filter(
        (t) =>
          t.status === "processing" && new Date(t.processedAt) < fiveMinutesAgo,
      );
      if (tasksToFail.length > 0) {
        const taskIdsToFail = tasksToFail.map((t) => t._id);
        const customerIdsToClean = tasksToFail.map((t) => t.person._id);
        await Promise.all([
          ScheduledJob.updateOne(
            { _id: job._id },
            {
              $set: {
                "tasks.$[elem].status": "failed",
                "tasks.$[elem].resultMessage": "Task timed out",
              },
              $inc: { "statistics.failed": tasksToFail.length },
            },
            { arrayFilters: [{ "elem._id": { $in: taskIdsToFail } }] },
          ),
          Customer.updateMany(
            { _id: { $in: customerIdsToClean } },
            { $pull: { action: { job: job._id } } },
          ),
        ]);
      }
    }
    const handleZaloTokenFailure = async (job, task, errorMessage) => {
      console.log(
        `🔴 Lỗi Token Zalo cho TK ${job.zaloAccount._id} trong Job ${job._id}. Bắt đầu hủy toàn bộ chiến dịch.`,
      );

      // Bước 1: Vô hiệu hóa tài khoản Zalo
      await ZaloAccount.findByIdAndUpdate(job.zaloAccount._id, {
        isTokenActive: false,
      });
      console.log(`   -> Đã đặt isTokenActive = false cho tài khoản Zalo.`);

      // Bước 2: Tìm tất cả các task còn lại để hủy
      const remainingTasks = job.tasks.filter((t) => t.status === "pending");
      const remainingTaskIds = remainingTasks.map((t) => t._id);
      const remainingCustomerIds = remainingTasks.map((t) => t.person._id);
      console.log(
        `   -> Tìm thấy ${remainingTasks.length} task 'pending' cần hủy.`,
      );

      // Bước 3: Ghi log cho từng task bị hủy
      for (const remainingTask of remainingTasks) {
        await logAutoCancelTaskForZaloFailure(job, remainingTask, errorMessage);
      }
      console.log(
        `   -> Đã ghi log hủy hàng loạt cho ${remainingTasks.length} task.`,
      );

      // Bước 4: Cập nhật trạng thái và thống kê
      const failedCount = remainingTasks.length + 1; // +1 cho task hiện tại đang lỗi
      job.statistics.failed += remainingTasks.length;

      if (remainingTaskIds.length > 0) {
        await ScheduledJob.updateOne(
          { _id: job._id },
          {
            $set: {
              "tasks.$[elem].status": "failed",
              "tasks.$[elem].resultMessage": "Hủy do lỗi tài khoản Zalo",
            },
            $inc: { "statistics.failed": remainingTasks.length },
          },
          { arrayFilters: [{ "elem._id": { $in: remainingTaskIds } }] },
        );
      }

      // Dọn dẹp customer refs
      if (remainingCustomerIds.length > 0) {
        await Customer.updateMany(
          { _id: { $in: remainingCustomerIds } },
          { $pull: { action: { job: job._id } } },
        );
      }

      console.log(`   -> Đã cập nhật trạng thái 'failed' cho các task.`);

      // Bước 5: Kết thúc và lưu trữ chiến dịch với trạng thái 'failed'
      const finalJobState = await ScheduledJob.findById(job._id); // Lấy trạng thái mới nhất
      await archiveAndCleanupJob(finalJobState, "failed");
      console.log(`   -> Đã lưu trữ và kết thúc chiến dịch.`);

      revalidateAndBroadcast("zalo_accounts"); // Cập nhật trạng thái Zalo Account ở client
    };

    let processedCount = 0;
    const allVariants = await Variant.find().lean();

    // BƯỚC 1: LẤY TẤT CẢ TASK ĐẾN HẠN TỪ MỌI CHIẾN DỊCH
    const dueTasks = await ScheduledJob.aggregate([
      // Tìm các chiến dịch có task cần chạy
      {
        $match: {
          "tasks.status": "pending",
          "tasks.scheduledFor": { $lte: now },
        },
      },
      // "Bung" mảng tasks ra thành các document riêng lẻ
      { $unwind: "$tasks" },
      // Lọc lại một lần nữa để chỉ giữ lại các task thỏa mãn điều kiện
      {
        $match: {
          "tasks.status": "pending",
          "tasks.scheduledFor": { $lte: now },
        },
      },
      // Sắp xếp TẤT CẢ CÁC TASK theo thời gian đến hạn
      { $sort: { "tasks.scheduledFor": 1 } },
      // Giới hạn số lượng task xử lý trong một lần chạy cron để tránh quá tải
      { $limit: 20 },
      // Gom lại các thông tin cần thiết
      {
        $project: {
          jobId: "$_id",
          jobName: "$jobName",
          actionType: "$actionType",
          zaloAccount: "$zaloAccount",
          config: "$config",
          createdBy: "$createdBy",
          task: "$tasks",
        },
      },
    ]);

    if (dueTasks.length === 0) {
      // Logic dọn dẹp job bị treo vẫn giữ nguyên
      const lingeringJobs = await ScheduledJob.find({
        $where:
          "this.statistics.total > 0 && (this.statistics.completed + this.statistics.failed) >= this.statistics.total",
      });
      for (const job of lingeringJobs) {
        console.log(`🧹 Dọn dẹp job bị treo (hết task): ${job.jobName}`);
        await archiveAndCleanupJob(job);
      }
      return NextResponse.json({
        headers: cors,
        message: "Không có task nào đến hạn.",
      });
    }

    // BƯỚC 2: XỬ LÝ TUẦN TỰ TỪNG TASK ĐÃ LỌC
    for (const item of dueTasks) {
      const { jobId, task } = item;

      // BƯỚC 2.1: "KHÓA" TASK MỘT CÁCH NGUYÊN TỬ (ATOMIC)
      const jobUpdate = await ScheduledJob.findOneAndUpdate(
        { _id: jobId, "tasks._id": task._id, "tasks.status": "pending" },
        {
          $set: {
            "tasks.$.status": "processing",
            "tasks.$.processedAt": new Date(),
          },
        },
        {
          new: true,
        },
      ).populate("zaloAccount"); // Populate để có thông tin Zalo Account

      // Nếu jobUpdate là null, có nghĩa là một tiến trình cron khác đã "nẫng tay trên"
      // -> bỏ qua và xử lý task tiếp theo
      if (!jobUpdate) {
        continue;
      }

      // BƯỚC 2.2: THỰC THI TASK (LOGIC GẦN NHƯ KHÔNG ĐỔI)
      let executionResult;

      try {
        const scriptResponse = await executeExternalScript(
          jobUpdate.actionType,
          jobUpdate.zaloAccount,
          task.person,
          jobUpdate.config,
          allVariants,
        );
        executionResult = {
          ...scriptResponse.scriptResult,
          finalMessage: scriptResponse.finalMessage,
        };
      } catch (e) {
        executionResult = { actionStatus: "error", actionMessage: e.message };
        // ** MODIFIED: Bắt đầu logic xử lý lỗi token
        if (e.message.includes("SyntaxError: Unexpected end of JSON input")) {
          // Lấy lại bản đầy đủ của job để xử lý
          const fullJob = await ScheduledJob.findById(jobId)
            .populate("zaloAccount")
            .lean();
          if (fullJob) {
            await handleZaloTokenFailure(fullJob, task, e.message);
          }
          // Bỏ qua các bước xử lý task hiện tại và chuyển sang task tiếp theo của job khác
          continue;
        }
      }

      const statusName =
        executionResult.actionStatus === "success" ? "SUCCESS" : "FAILED";

      // ** MODIFIED: Tái cấu trúc logic xử lý kết quả
      const { uidStatus, targetUid, actionMessage } = executionResult;
      const customerUpdatePayload = {};
      if (uidStatus === "found_new" && targetUid) {
        customerUpdatePayload.uid = targetUid;
      } else if (uidStatus === "provided" && statusName === "FAILED") {
        customerUpdatePayload.uid = null;
      } else if (
        uidStatus === "not_found" ||
        (jobUpdate.actionType === "findUid" && statusName === "FAILED")
      ) {
        customerUpdatePayload.uid = actionMessage || "Lỗi không xác định";
      }
      const jobInfoForLogging = {
        ...item,
        zaloAccountId: item.zaloAccount,
        jobId: item.jobId,
      };

      // Thực hiện ghi log và cập nhật UID song song
      await Promise.all([
        logExecuteScheduleTask({
          jobInfo: jobInfoForLogging,
          task: task,
          customerId: task.person._id,
          statusName,
          executionResult,
          finalMessage: executionResult.finalMessage,
        }),
        Object.keys(customerUpdatePayload).length > 0
          ? Customer.updateOne(
              { _id: task.person._id },
              { $set: customerUpdatePayload },
            )
          : Promise.resolve(),
        Customer.updateOne(
          { _id: task.person._id },
          { $pull: { action: { job: jobId } } },
        ),
      ]);

      // ** MODIFIED: Tích hợp lại logic xử lý rate limit và dùng biến `jobUpdate`
      if (statusName === "FAILED" && jobUpdate.actionType === "findUid") {
        const errorMessage = executionResult.actionMessage || "";
        let cancelScope = null;
        if (errorMessage.includes("trong 1 giờ")) cancelScope = "hour";
        else if (errorMessage.includes("trong 1 ngày")) cancelScope = "day";

        if (cancelScope) {
          const originalJobState = await ScheduledJob.findById(
            jobUpdate._id,
          ).lean();
          if (originalJobState) {
            const endTime = new Date(now);
            if (cancelScope === "hour") {
              endTime.setMinutes(59, 59, 999);
            } else {
              endTime.setHours(23, 59, 59, 999);
            }

            const tasksToCancel = (originalJobState.tasks || []).filter(
              (t) =>
                t.status === "pending" && new Date(t.scheduledFor) <= endTime,
            );

            if (tasksToCancel.length > 0) {
              console.log(
                `⚠️  Phát hiện lỗi giới hạn ${cancelScope}, đang hủy ${tasksToCancel.length} task...`,
              );
              const taskIdsToCancel = tasksToCancel.map((t) => t._id);
              const customerIdsToClean = tasksToCancel.map((t) => t.person._id);
              for (const taskToCancel of tasksToCancel) {
                await logAutoCancelTask(
                  originalJobState,
                  taskToCancel,
                  cancelScope,
                );
              }

              await ScheduledJob.updateOne(
                { _id: jobUpdate._id },
                {
                  $set: {
                    "tasks.$[elem].status": "failed",
                    "tasks.$[elem].resultMessage": `Tự động hủy do đạt giới hạn ${cancelScope}`,
                  },
                  $inc: { "statistics.failed": tasksToCancel.length },
                },
                { arrayFilters: [{ "elem._id": { $in: taskIdsToCancel } }] },
              );

              await Customer.updateMany(
                { _id: { $in: customerIdsToClean } },
                { $pull: { action: { job: jobUpdate._id } } },
              );
            }
          }
        }
      }

      // BƯỚC 2.4: CẬP NHẬT KẾT QUẢ CUỐI CÙNG VÀO ĐÚNG TASK ĐÓ
      const finalUpdateResult = await ScheduledJob.findOneAndUpdate(
        { _id: jobId, "tasks._id": task._id },
        {
          $set: {
            "tasks.$.status": statusName === "SUCCESS" ? "completed" : "failed",
            "tasks.$.resultMessage":
              executionResult.actionMessage || statusName,
          },
          $inc: {
            [statusName === "SUCCESS"
              ? "statistics.completed"
              : "statistics.failed"]: 1,
          },
        },
        { new: true },
      );
      processedCount++;

      // BƯỚC 2.5: KIỂM TRA HOÀN THÀNH CHIẾN DỊCH
      if (finalUpdateResult) {
        const stats = finalUpdateResult.statistics;
        if (stats && stats.completed + stats.failed >= stats.total) {
          await archiveAndCleanupJob(finalUpdateResult);
        }
      }
    }

    // ** ADDED: Kiểm tra lại các job đã hết task nhưng chưa được lưu

    if (processedCount > 0) {
      revalidateAndBroadcast("customer_data");
      revalidateAndBroadcast("running_jobs");
    }

    return NextResponse.json({
      headers: cors,
      message: `Cron job đã chạy. Xử lý ${processedCount} tác vụ.`,
    });
  } catch (err) {
    console.error("CRON JOB FAILED:", err);
    return NextResponse.json(
      { message: "Lỗi nghiêm trọng trong CRON job.", error: err.message },
      { status: 500 },
    );
  }
};
