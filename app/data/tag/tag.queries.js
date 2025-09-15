// [MOD] app/data/tag/tag.queries.js
"use server";

import connectDB from "@/config/connectDB";
import Tag from "@/models/tag";
import { getCurrentUser } from "@/lib/session";

/**
 * Lấy danh sách tất cả các tags để hiển thị trong bộ lọc.
 * Yêu cầu người dùng phải đăng nhập.
 */
export async function getTagsForFilter() {
  try {
    await connectDB();
    // [ADD] Tự lấy và xác thực người dùng từ session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.warn("Attempted to fetch tags without a valid session.");
      return []; // Trả về mảng rỗng nếu không có session
    }

    const tags = await Tag.find({}).select("_id name").sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(tags));
  } catch (error) {
    console.error("Loi trong getTagsForFilter:", error);
    return [];
  }
}
