// File: data/tag/tag.actions.js
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
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const { id, name, detail } = data;
    if (!name) throw new Error("Tên tag là bắt buộc.");

    const tagData = { name, detail, createdBy: currentUser.id };

    let savedTag;
    if (id) {
      savedTag = await Tag.findByIdAndUpdate(id, tagData, { new: true });
    } else {
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
    // Cần thêm logic xóa tag này khỏi tất cả các customer đang sử dụng nó
    // await Customer.updateMany({ tags: tagId }, { $pull: { tags: tagId } });
    await Tag.findByIdAndDelete(tagId);
    revalidateAndBroadcast("tags");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
