// File: data/schedule/schedule.actions.js
"use server";

import connectDB from "@/config/connectDB";
import ScheduledJob from "@/models/schedule";
import ArchivedJob from "@/models/archivedJob";
import Customer from "@/models/customer";
import ZaloAccount from "@/models/zalo";
import { getCurrentUser } from "@/lib/session";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import mongoose, { Types } from "mongoose";
import { logAction } from "../history/history.actions.js";

// --- HÀM TÍNH TOÁN LỊCH TRÌNH ---
function schedulePersonsSmart(persons, account, actionsPerHour, actionType) {
  // ... (logic hàm schedulePersonsSmart giữ nguyên như cũ)
  const scheduledTasks = [];
  const baseIntervalMs = 3_600_000 / actionsPerHour;
  const now = new Date();

  let currentTime = new Date(
    Math.max(now.getTime(), account.rateLimitHourStart?.getTime() || 0),
  );
  let rateLimitHourStart = new Date(account.rateLimitHourStart || now);
  let rateLimitDayStart = new Date(account.rateLimitDayStart || now);
  let actionsUsedThisHour = account.actionsUsedThisHour || 0;
  let actionsUsedThisDay = account.actionsUsedThisDay || 0;

  const getNextDayStart = (date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  };

  for (const person of persons) {
    if (actionType !== "sendMessage") {
      let safeTimeFound = false;
      while (!safeTimeFound) {
        const currentHourStartRef = new Date(currentTime);
        currentHourStartRef.setMinutes(0, 0, 0);

        if (currentTime.getTime() >= rateLimitHourStart.getTime() + 3_600_000) {
          rateLimitHourStart = new Date(currentHourStartRef);
          actionsUsedThisHour = 0;
        }

        if (
          currentTime.getTime() >= getNextDayStart(rateLimitDayStart).getTime()
        ) {
          rateLimitDayStart = new Date(currentTime);
          rateLimitDayStart.setHours(0, 0, 0, 0);
          actionsUsedThisDay = 0;
          actionsUsedThisHour = 0;
        }

        if (actionsUsedThisHour >= account.rateLimitPerHour) {
          currentTime = new Date(rateLimitHourStart.getTime() + 3_600_000);
          continue;
        }
        if (actionsUsedThisDay >= account.rateLimitPerDay) {
          currentTime = getNextDayStart(rateLimitDayStart);
          continue;
        }
        safeTimeFound = true;
      }
    }

    const jitterMs = (Math.random() - 0.5) * baseIntervalMs * 0.3;
    const finalScheduledTime = new Date(currentTime.getTime() + jitterMs);

    scheduledTasks.push({
      person,
      scheduledFor: finalScheduledTime,
      status: "pending",
    });

    actionsUsedThisHour++;
    actionsUsedThisDay++;
    currentTime.setTime(currentTime.getTime() + baseIntervalMs);
  }

  return {
    scheduledTasks,
    estimatedCompletion: new Date(currentTime.getTime()),
    finalCounters: {
      actionsUsedThisHour,
      rateLimitHourStart,
      actionsUsedThisDay,
      rateLimitDayStart,
    },
  };
}

// --- CÁC HÀM HÀNH ĐỘNG (ACTIONS) ---

export async function getScheduleEstimation(actionType, taskCount) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user?.zaloActive) {
      throw new Error("Vui lòng chọn tài khoản Zalo đang hoạt động.");
    }

    const account = await ZaloAccount.findById(user.zaloActive);
    if (!account) {
      throw new Error("Không tìm thấy tài khoản Zalo.");
    }

    const mockPersons = Array.from({ length: taskCount }, (_, i) => ({
      id: i,
    }));

    const { estimatedCompletion, smartStartDate } = schedulePersonsSmart(
      mockPersons,
      account,
      account.rateLimitPerHour,
    );

    return {
      success: true,
      data: {
        estimatedStart: smartStartDate.toLocaleString("vi-VN"),
        estimatedCompletion: estimatedCompletion.toLocaleString("vi-VN"),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createSchedule(data) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const { jobName, actionType, config = {}, tasks } = data;
    if (!tasks || tasks.length === 0)
      throw new Error("Không có khách hàng nào được chọn.");

    const zaloAccountId = currentUser.zaloActive?._id;
    if (!zaloAccountId) throw new Error("Chưa chọn tài khoản Zalo hoạt động.");

    const account = await ZaloAccount.findById(zaloAccountId).session(session);
    if (!account) throw new Error("Không tìm thấy tài khoản Zalo.");

    const finalActionsPerHour =
      config.actionsPerHour || account.rateLimitPerHour;

    const { scheduledTasks, estimatedCompletion, finalCounters } =
      schedulePersonsSmart(
        tasks.map((t) => t.person),
        account,
        finalActionsPerHour,
        actionType,
      );

    await ZaloAccount.updateOne(
      { _id: zaloAccountId },
      { $set: finalCounters },
      { session },
    );

    const [newJob] = await ScheduledJob.create(
      [
        {
          jobName:
            jobName ||
            `Lịch trình ngày ${new Date().toLocaleDateString("vi-VN")}`,
          actionType,
          zaloAccount: zaloAccountId,
          tasks: scheduledTasks,
          config,
          statistics: { total: tasks.length },
          estimatedCompletionTime: estimatedCompletion,
          createdBy: currentUser.id,
        },
      ],
      { session },
    );

    const personIds = tasks.map((t) => t.person._id);
    await Customer.updateMany(
      { _id: { $in: personIds } },
      { $push: { action: { job: newJob._id } } },
      { session },
    );

    for (const task of newJob.tasks) {
      await logAction({
        actionType: `create_schedule_${actionType.toLowerCase()}`,
        actorId: currentUser.id,
        context: { customerId: task.person._id, zaloAccountId: zaloAccountId },
        detail: {
          scheduleId: newJob._id,
          scheduledFor: task.scheduledFor,
          ...(actionType === "sendMessage" && {
            messageTemplate: config.messageTemplate,
          }),
        },
      });
    }

    await session.commitTransaction();
    revalidateAndBroadcast("running_jobs");
    revalidateAndBroadcast("customer_data");
    return { success: true, data: JSON.parse(JSON.stringify(newJob)) };
  } catch (err) {
    await session.abortTransaction();
    return { success: false, error: err.message };
  } finally {
    session.endSession();
  }
}

export async function stopSchedule(scheduleId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");
    await connectDB();

    const jobToStop = await ScheduledJob.findById(scheduleId)
      .session(session)
      .lean();
    if (!jobToStop) throw new Error("Không tìm thấy lịch trình để dừng.");

    const archiveData = {
      ...jobToStop,
      status: "paused",
      completedAt: new Date(),
    };
    await ArchivedJob.create([archiveData], { session });
    await ScheduledJob.findByIdAndDelete(scheduleId, { session });

    const customerIdsInJob = jobToStop.tasks.map((task) => task.person._id);
    if (customerIdsInJob.length > 0) {
      await Customer.updateMany(
        { _id: { $in: customerIdsInJob } },
        { $pull: { action: { job: jobToStop._id } } },
        { session },
      );
    }

    const pendingTasks = jobToStop.tasks.filter(
      (t) => t.status === "pending" || t.status === "processing",
    );
    for (const task of pendingTasks) {
      await logAction({
        actionType: `delete_schedule_${jobToStop.actionType.toLowerCase()}`,
        actorId: currentUser.id,
        context: {
          customerId: task.person._id,
          zaloAccountId: jobToStop.zaloAccount,
        },
        detail: { scheduleId: jobToStop._id, scheduledFor: task.scheduledFor },
      });
    }

    await session.commitTransaction();

    revalidateAndBroadcast("running_jobs");
    revalidateAndBroadcast("archived_jobs");
    revalidateAndBroadcast("customer_data");
    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

export async function removeTaskFromSchedule(scheduleId, taskId) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");
    await connectDB();

    const schedule = await ScheduledJob.findById(scheduleId);
    if (!schedule) return { error: "Không tìm thấy lịch trình." };

    const taskToRemove = schedule.tasks.find(
      (t) => t._id.toString() === taskId,
    );
    if (!taskToRemove)
      return { error: "Không tìm thấy người nhận trong lịch trình." };

    await logAction({
      actionType: `delete_schedule_${schedule.actionType.toLowerCase()}`,
      actorId: currentUser.id,
      context: {
        customerId: taskToRemove.person._id,
        zaloAccountId: schedule.zaloAccount,
      },
      detail: {
        scheduleId: schedule._id,
        scheduledFor: taskToRemove.scheduledFor,
      },
    });

    const [updatedJobResult] = await Promise.all([
      ScheduledJob.findByIdAndUpdate(
        scheduleId,
        { $pull: { tasks: { _id: taskId } }, $inc: { "statistics.total": -1 } },
        { new: true },
      ),
      Customer.updateOne(
        { _id: taskToRemove.person._id },
        { $pull: { action: { job: scheduleId } } },
      ),
    ]);

    revalidateAndBroadcast("running_jobs");
    revalidateAndBroadcast("customer_data");
    return {
      success: true,
      updatedJob: JSON.parse(JSON.stringify(updatedJobResult)),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
