// [ADD] app/data/fieldDefinition/fieldDefinition.actions.js
"use server";

import connectDB from "@/config/connectDB";
import FieldDefinition from "@/models/fieldDefinition";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";

/**
 * Tạo mới hoặc cập nhật một FieldDefinition.
 */
export async function createOrUpdateFieldDefinition(data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const { id, ...updateData } = data;
    // [FIX] Sử dụng currentUser._id thay vì currentUser.id
    updateData.createdBy = currentUser._id;

    // Đảm bảo các mảng IDs luôn tồn tại
    updateData.programIds = updateData.programIds || [];
    updateData.dataSourceIds = updateData.dataSourceIds || [];

    let savedDef;
    if (id) {
      savedDef = await FieldDefinition.findByIdAndUpdate(id, updateData, {
        new: true,
      });
    } else {
      savedDef = await FieldDefinition.create(updateData);
    }

    revalidateAndBroadcast("field_definitions");
    return { success: true, data: JSON.parse(JSON.stringify(savedDef)) };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        error: `Tên trường "${data.fieldName}" đã tồn tại.`,
      };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một FieldDefinition.
 */
export async function deleteFieldDefinition(id) {
  try {
    await connectDB();
    await FieldDefinition.findByIdAndDelete(id);
    revalidateAndBroadcast("field_definitions");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
