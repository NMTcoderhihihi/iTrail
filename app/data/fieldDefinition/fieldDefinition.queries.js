// [ADD] app/data/fieldDefinition/fieldDefinition.queries.js
"use server";

import connectDB from "@/config/connectDB";
import FieldDefinition from "@/models/fieldDefinition";
import { Types } from "mongoose"; // [ADD]

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

// [ADD] Hàm mới để lấy chi tiết một Field Definition bằng ID
/**
 * Lấy chi tiết một Field Definition bằng ID.
 * @param {string} id - ID của Field Definition cần lấy.
 * @returns {Promise<object>} - Trả về object chứa dữ liệu hoặc lỗi.
 */
export async function getFieldDefinitionById(id) {
  try {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new Error("ID không hợp lệ.");
    }
    await connectDB();
    const definition = await FieldDefinition.findById(id).lean();
    if (!definition) {
      return { success: false, error: "Không tìm thấy định nghĩa trường." };
    }
    return { success: true, data: JSON.parse(JSON.stringify(definition)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
