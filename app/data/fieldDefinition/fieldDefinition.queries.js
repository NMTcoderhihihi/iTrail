// [ADD] app/data/fieldDefinition/fieldDefinition.queries.js
"use server";

import connectDB from "@/config/connectDB";
import FieldDefinition from "@/models/fieldDefinition";

/**
 * Lấy danh sách các FieldDefinitions với phân trang.
 */
export async function getFieldDefinitions({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;

    const [definitions, total] = await Promise.all([
      FieldDefinition.find({})
        .populate("createdBy", "name")
        .populate("programIds", "name")
        .populate("dataSourceIds", "name")
        .sort({ fieldName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FieldDefinition.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(definitions)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}
