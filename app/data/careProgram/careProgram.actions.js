// File: data/careProgram/careProgram.actions.js
"use server";

import connectDB from "@/config/connectDB";
import CareProgram from "@/models/careProgram";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { Types } from "mongoose";

// --- ACTIONS FOR CARE PROGRAM ---

export async function createCareProgram(data) {
  try {
    await connectDB();
    const newProgram = await CareProgram.create(data);
    revalidateAndBroadcast("care_programs");
    return { success: true, data: JSON.parse(JSON.stringify(newProgram)) };
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

    await CareProgram.updateOne(
      { _id: programId, "statuses._id": statusId },
      { $set: updateFields },
    );
    revalidateAndBroadcast("care_programs");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteStatusFromProgram(programId, statusId) {
  try {
    await connectDB();
    // Cần thêm logic kiểm tra xem status có đang được customer nào sử dụng không
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
