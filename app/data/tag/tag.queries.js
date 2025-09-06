// File: data/tag/tag.queries.js
"use server";

import connectDB from "@/config/connectDB";
import Tag from "@/models/tag";

/**
 * Lấy danh sách tất cả các tags để hiển thị trong bộ lọc.
 */
export async function getTagsForFilter() {
  try {
    await connectDB();
    const tags = await Tag.find({}).select("_id name").sort({ name: 1 }).lean();
    return JSON.parse(JSON.stringify(tags));
  } catch (error) {
    console.error("Loi trong getTagsForFilter:", error);
    return [];
  }
}
