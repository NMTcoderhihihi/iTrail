// File: data/variant/variant.queries.js
"use server";

import connectDB from "@/config/connectDB";
import Variant from "@/models/variant";

/**
 * Lấy danh sách các biến thể (variants) với phân trang.
 */
export async function getVariants({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;

    const [variants, total] = await Promise.all([
      Variant.find({}).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Variant.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(variants)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}
