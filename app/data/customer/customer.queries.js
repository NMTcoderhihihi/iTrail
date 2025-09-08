// ++ MODIFIED: Toàn bộ file này được tái cấu trúc để sử dụng Aggregation Pipeline
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import User from "@/models/users";
import Tag from "@/models/tag";
import CareProgram from "@/models/careProgram";
import { Types } from "mongoose";

/**
 * Lấy danh sách khách hàng nâng cao, hỗ trợ nhiều bộ lọc phức tạp và join dữ liệu.
 * @param {object} filters - Các tham số lọc từ client (thay thế cho searchParams).
 * @param {object} currentUser - Thông tin người dùng đang đăng nhập (từ session).
 * @returns {Promise<object>} - Dữ liệu khách hàng và thông tin phân trang.
 */
// [MOD] Thay đổi chữ ký hàm để nhận 'filters' object
export async function getClientes(filters = {}, currentUser = null) {
  try {
    await connectDB();

    // [MOD] Đọc giá trị từ object 'filters' thay vì 'searchParams'
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    // --- Xây dựng bộ lọc $match mạnh mẽ ---
    const matchStage = {};

    // 1. Phân quyền: Lọc theo user được gán
    if (currentUser && currentUser.role !== "Admin") {
      matchStage.users = new Types.ObjectId(currentUser.id);
    } else if (filters.userId && Types.ObjectId.isValid(filters.userId)) {
      matchStage.users = new Types.ObjectId(filters.userId);
    }

    if (filters.query) {
      const searchRegex = new RegExp(filters.query, "i");
      matchStage.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { citizenId: searchRegex },
      ];
    }

    if (filters.tags) {
      const tagIds = filters.tags
        .split(",")
        .map((id) => new Types.ObjectId(id));
      if (tagIds.length > 0) {
        matchStage.tags = { $in: tagIds };
      }
    }

    const enrollmentFilters = {};
    if (filters.programId && Types.ObjectId.isValid(filters.programId)) {
      enrollmentFilters.programId = new Types.ObjectId(filters.programId);
    }
    if (filters.stageId && Types.ObjectId.isValid(filters.stageId)) {
      enrollmentFilters.stageId = new Types.ObjectId(filters.stageId);
    }
    if (filters.statusId && Types.ObjectId.isValid(filters.statusId)) {
      enrollmentFilters.statusId = new Types.ObjectId(filters.statusId);
    }
    if (Object.keys(enrollmentFilters).length > 0) {
      matchStage.programEnrollments = { $elemMatch: enrollmentFilters };
    }

    // 5. Lọc theo UID và Zalo Account
    if (
      filters.uidStatus &&
      filters.uidFilterZaloId &&
      Types.ObjectId.isValid(filters.uidFilterZaloId)
    ) {
      const zaloId = new Types.ObjectId(filters.uidFilterZaloId);
      switch (filters.uidStatus) {
        case "found":
          matchStage.uid = { $elemMatch: { zaloId, uid: { $regex: /^\d+$/ } } };
          break;
        case "error":
          matchStage.uid = { $elemMatch: { zaloId, uid: { $not: /^\d+$/ } } };
          break;
        case "pending":
          matchStage.uid = { $not: { $elemMatch: { zaloId: zaloId } } };
          break;
      }
    }

    // --- Xây dựng Aggregation Pipeline ---
    const pipeline = [{ $match: matchStage }, { $sort: { createdAt: -1 } }];

    // --- Thực thi truy vấn song song ---
    const [clientsFromDB, totalClients] = await Promise.all([
      Customer.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "users",
            foreignField: "_id",
            as: "users",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: {
            path: "$programEnrollments",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "careprograms",
            localField: "programEnrollments.programId",
            foreignField: "_id",
            as: "programDetails",
          },
        },
        {
          $unwind: {
            path: "$programDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            statusInfo: {
              $first: {
                $filter: {
                  input: "$programDetails.statuses",
                  as: "status",
                  cond: {
                    $eq: ["$$status._id", "$programEnrollments.statusId"],
                  },
                },
              },
            },
            stageInfo: {
              $first: {
                $filter: {
                  input: "$programDetails.stages",
                  as: "stage",
                  cond: { $eq: ["$$stage._id", "$programEnrollments.stageId"] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            phone: { $first: "$phone" },
            citizenId: { $first: "$citizenId" },
            uid: { $first: "$uid" },
            action: { $first: "$action" },
            createdAt: { $first: "$createdAt" },
            users: { $first: "$users" },
            tags: { $first: "$tags" },
            // Lấy thông tin status/stage đã xử lý
            status: { $first: "$statusInfo" },
            stage: { $first: "$stageInfo" },
          },
        },
        { $sort: { createdAt: -1 } }, // Sắp xếp lại sau khi group
      ]),
      Customer.countDocuments(matchStage),
    ]);

    return {
      data: JSON.parse(JSON.stringify(clientsFromDB)),
      pagination: {
        page,
        limit,
        total: totalClients,
        totalPages: Math.ceil(totalClients / limit) || 1,
      },
    };
  } catch (error) {
    console.error("Loi trong getClientes:", error);
    return {
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    };
  }
}
