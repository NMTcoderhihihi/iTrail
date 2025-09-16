// File: data/careProgram/careProgram.actions.js
"use server";

import connectDB from "@/config/connectDB";
import CareProgram from "@/models/careProgram";
import Customer from "@/models/customer";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/session";

// --- ACTIONS FOR CARE PROGRAM ---

export async function createCareProgram(data) {
  try {
    await connectDB();
    // [ADD] Lấy thông tin người dùng hiện tại
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Yêu cầu đăng nhập để thực hiện hành động này.");
    }

    // [ADD] Thêm createdBy vào dữ liệu chương trình mới
    const programData = {
      ...data,
      createdBy: currentUser._id,
    };

    const newProgram = await CareProgram.create(programData);
    revalidateAndBroadcast("care_programs");
    return { success: true, data: JSON.parse(JSON.stringify(newProgram)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateCareProgram(programId, data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Yêu cầu đăng nhập.");
    }

    const updatedProgram = await CareProgram.findByIdAndUpdate(
      programId,
      {
        $set: {
          name: data.name,
          description: data.description,
          isActive: data.isActive,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedProgram) {
      throw new Error("Không tìm thấy chương trình để cập nhật.");
    }

    revalidateAndBroadcast("care_programs");
    return { success: true, data: JSON.parse(JSON.stringify(updatedProgram)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// --- ACTIONS FOR STATUSES WITHIN A PROGRAM ---

export async function addStatusToProgram(programId, statusData) {
  try {
    await connectDB();
    if (!programId || !statusData || !statusData.name) {
      throw new Error("Thiếu thông tin chương trình hoặc trạng thái.");
    }
    const newStatus = { ...statusData, _id: new Types.ObjectId() };
    await CareProgram.findByIdAndUpdate(programId, {
      $push: { statuses: newStatus },
    });
    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateStatusInProgram(programId, statusId, statusData) {
  try {
    await connectDB();
    const updateFields = {};
    if (statusData.name) updateFields["statuses.$.name"] = statusData.name;
    if (statusData.description)
      updateFields["statuses.$.description"] = statusData.description;

    const result = await CareProgram.updateOne(
      { _id: programId, "statuses._id": statusId },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      throw new Error("Không tìm thấy trạng thái để cập nhật.");
    }

    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteStatusFromProgram(programId, statusId) {
  try {
    await connectDB();

    // [ADD] Bước kiểm tra an toàn
    const customerUsingStatus = await Customer.findOne({
      "programEnrollments.programId": programId,
      "programEnrollments.statusId": statusId,
    }).lean();

    if (customerUsingStatus) {
      throw new Error(
        "Không thể xóa. Trạng thái này đang được ít nhất một khách hàng sử dụng.",
      );
    }

    await CareProgram.findByIdAndUpdate(programId, {
      $pull: { statuses: { _id: statusId } },
    });
    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// --- ACTIONS FOR STAGES WITHIN A PROGRAM (Tương tự cho Stages) ---

export async function addStageToProgram(programId, stageData) {
  try {
    await connectDB();
    const newStage = { ...stageData, _id: new Types.ObjectId() };
    await CareProgram.findByIdAndUpdate(programId, {
      $push: { stages: newStage },
    });
    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// [ADD] Hàm mới để cập nhật Stage
export async function updateStageInProgram(programId, stageId, stageData) {
  try {
    await connectDB();
    const updateFields = {};
    if (stageData.name) updateFields["stages.$.name"] = stageData.name;
    if (stageData.description)
      updateFields["stages.$.description"] = stageData.description;
    if (stageData.level) updateFields["stages.$.level"] = stageData.level;

    const result = await CareProgram.updateOne(
      { _id: programId, "stages._id": stageId },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      throw new Error("Không tìm thấy giai đoạn để cập nhật.");
    }

    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteStageFromProgram(programId, stageId) {
  try {
    await connectDB();

    // [ADD] Bước kiểm tra an toàn
    const customerUsingStage = await Customer.findOne({
      "programEnrollments.programId": programId,
      "programEnrollments.stageId": stageId,
    }).lean();

    if (customerUsingStage) {
      throw new Error(
        "Không thể xóa. Giai đoạn này đang được ít nhất một khách hàng sử dụng.",
      );
    }

    await CareProgram.findByIdAndUpdate(programId, {
      $pull: { stages: { _id: stageId } },
    });
    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
