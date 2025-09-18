// [ADD] app/data/fieldDefinition/fieldDefinition.queries.js
"use server";

import connectDB from "@/config/connectDB";
import FieldDefinition from "@/models/fieldDefinition";
import { Types } from "mongoose";

/**
 * Lấy danh sách các FieldDefinitions với phân trang. (Sử dụng Aggregation)
 */
export async function getFieldDefinitions({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;

    const [definitions, total] = await Promise.all([
      FieldDefinition.aggregate([
        { $sort: { fieldName: 1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            allProgramIds: {
              $reduce: {
                input: "$displayRules.conditions.requiredPrograms",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          },
        },
        // [ADD] Gộp tất cả các tag ID từ các quy tắc lại
        {
          $addFields: {
            allTagIds: {
              $reduce: {
                input: "$displayRules.conditions.requiredTags",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
          },
        },
        // Populate programs và tags dựa trên các mảng ID đã gộp
        {
          $lookup: {
            from: "careprograms",
            localField: "allProgramIds",
            foreignField: "_id",
            as: "programs",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        // [ADD] Thêm lookup cho tags
        {
          $lookup: {
            from: "tags",
            localField: "allTagIds",
            foreignField: "_id",
            as: "tags",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
      ]),
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
    // [MOD] Thêm .populate() để lấy tên từ các collection liên quan
    const definition = await FieldDefinition.findById(id)
      .populate("displayRules.conditions.requiredPrograms", "name")
      .populate("displayRules.conditions.requiredTags", "name")
      .populate("dataSourceIds", "name")
      .lean();

    if (!definition) {
      return { success: false, error: "Không tìm thấy định nghĩa trường." };
    }
    return { success: true, data: JSON.parse(JSON.stringify(definition)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
