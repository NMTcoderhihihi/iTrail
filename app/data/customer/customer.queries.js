// ++ MODIFIED: Toàn bộ file này được tái cấu trúc để sử dụng Aggregation Pipeline
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import User from "@/models/users";
import Tag from "@/models/tag";
import CareProgram from "@/models/careProgram";
import { Types } from "mongoose";

// [MOD] Chữ ký hàm thay đổi: nhận lại `filters` thay cho `searchParams`
export async function getClientes(filters = {}, currentUser = null) {
  try {
    await connectDB();

    // [MOD] Đọc và xử lý các giá trị từ object `filters` thông thường
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
      // [FIX] Đảm bảo `tags` luôn là mảng để xử lý
      const tagValues = Array.isArray(filters.tags)
        ? filters.tags
        : [filters.tags];
      const tagIds = tagValues
        .flatMap((tag) => tag.split(",")) // Xử lý trường hợp "tag1,tag2"
        .map((id) =>
          Types.ObjectId.isValid(id.trim())
            ? new Types.ObjectId(id.trim())
            : null,
        )
        .filter(Boolean);
      if (tagIds.length > 0) {
        matchStage.tags = { $in: tagIds };
      }
    }

    const enrollmentFilters = {};
    if (filters.programId && Types.ObjectId.isValid(filters.programId)) {
      enrollmentFilters.programId = new Types.ObjectId(filters.programId);
    }

    if (filters.stageId) {
      const stageValues = Array.isArray(filters.stageId)
        ? filters.stageId
        : [filters.stageId];
      const stageIds = stageValues
        .flatMap((id) => id.split(","))
        .map((id) =>
          Types.ObjectId.isValid(id.trim())
            ? new Types.ObjectId(id.trim())
            : null,
        )
        .filter(Boolean);
      if (stageIds.length > 0) {
        enrollmentFilters.stageId = { $in: stageIds };
      }
    }

    if (filters.statusId) {
      const statusValues = Array.isArray(filters.statusId)
        ? filters.statusId
        : [filters.statusId];
      const statusIds = statusValues
        .flatMap((id) => id.split(","))
        .map((id) =>
          Types.ObjectId.isValid(id.trim())
            ? new Types.ObjectId(id.trim())
            : null,
        )
        .filter(Boolean);
      if (statusIds.length > 0) {
        enrollmentFilters.statusId = { $in: statusIds };
      }
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
            status: { $first: "$statusInfo" },
            stage: { $first: "$stageInfo" },
          },
        },
        { $sort: { createdAt: -1 } },
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
