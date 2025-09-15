// [MOD] app/data/tag/tag.action.js
"use server";

import connectDB from "@/config/connectDB";
import Tag from "@/models/tag";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";

/**
 * Tạo hoặc cập nhật một Tag.
 */
export async function createOrUpdateTag(data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Yêu cầu đăng nhập.");
    }

    const { id, name, detail } = data;
    if (!name || name.trim() === "") {
      throw new Error("Tên tag là bắt buộc.");
    }

    let savedTag;

    if (id) {
      // LOGIC CẬP NHẬT: An toàn và chính xác
      // 1. Tìm document đầy đủ trong DB.
      savedTag = await Tag.findById(id);
      if (!savedTag) {
        throw new Error("Không tìm thấy tag để cập nhật.");
      }

      // 2. Chỉ cập nhật các trường cần thiết.
      savedTag.name = name.trim();
      savedTag.detail = detail.trim();

      // 3. Gọi .save() để Mongoose tự động kiểm tra và lưu.
      // Phương thức này sẽ giữ nguyên trường `createdBy` gốc.
      await savedTag.save();
    } else {
      // LOGIC TẠO MỚI: Gán createdBy
      const tagData = {
        name: name.trim(),
        detail: detail.trim(),
        // [FIX] Sử dụng currentUser._id thay vì currentUser.id
        createdBy: currentUser._id,
      };
      savedTag = await Tag.create(tagData);
    }

    revalidateAndBroadcast("tags");
    return { success: true, data: JSON.parse(JSON.stringify(savedTag)) };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, error: `Tag "${data.name}" đã tồn tại.` };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một Tag.
 */
export async function deleteTag(tagId) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Yêu cầu đăng nhập.");
    }

    const deleted = await Tag.findByIdAndDelete(tagId);
    if (!deleted) {
      throw new Error("Không tìm thấy tag để xóa.");
    }

    revalidateAndBroadcast("tags");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
