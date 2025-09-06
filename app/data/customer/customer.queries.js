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
 * @param {object} searchParams - Các tham số lọc từ client.
 * @param {object} currentUser - Thông tin người dùng đang đăng nhập (từ session).
 * @returns {Promise<object>} - Dữ liệu khách hàng và thông tin phân trang.
 */
export async function getClientes(searchParams = {}, currentUser = null) {
  try {
    await connectDB();

    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 50;
    const skip = (page - 1) * limit;

    // --- Xây dựng bộ lọc $match mạnh mẽ ---
    const matchStage = {};

    // 1. Phân quyền: Lọc theo user được gán
    if (currentUser && currentUser.role !== "Admin") {
      matchStage.users = new Types.ObjectId(currentUser.id);
    } else if (
      searchParams.userId &&
      Types.ObjectId.isValid(searchParams.userId)
    ) {
      matchStage.users = new Types.ObjectId(searchParams.userId);
    }

    // 2. Tìm kiếm cơ bản (name, phone, citizenId)
    if (searchParams.query) {
      const searchRegex = new RegExp(searchParams.query, "i");
      matchStage.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { citizenId: searchRegex },
      ];
    }

    // 3. Lọc theo Tags
    if (searchParams.tags) {
      const tagIds = searchParams.tags
        .split(",")
        .map((id) => new Types.ObjectId(id));
      if (tagIds.length > 0) {
        matchStage.tags = { $in: tagIds };
      }
    }

    // 4. Lọc theo Chương trình, Giai đoạn, Trạng thái
    const enrollmentFilters = {};
    if (
      searchParams.programId &&
      Types.ObjectId.isValid(searchParams.programId)
    ) {
      enrollmentFilters.programId = new Types.ObjectId(searchParams.programId);
    }
    if (searchParams.stageId && Types.ObjectId.isValid(searchParams.stageId)) {
      enrollmentFilters.stageId = new Types.ObjectId(searchParams.stageId);
    }
    if (
      searchParams.statusId &&
      Types.ObjectId.isValid(searchParams.statusId)
    ) {
      enrollmentFilters.statusId = new Types.ObjectId(searchParams.statusId);
    }
    if (Object.keys(enrollmentFilters).length > 0) {
      matchStage.programEnrollments = { $elemMatch: enrollmentFilters };
    }

    // 5. Lọc theo UID và Zalo Account
    if (
      searchParams.uidStatus &&
      searchParams.uidFilterZaloId &&
      Types.ObjectId.isValid(searchParams.uidFilterZaloId)
    ) {
      const zaloId = new Types.ObjectId(searchParams.uidFilterZaloId);
      switch (searchParams.uidStatus) {
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
        totalPages: Math.ceil(totalClients / limit),
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
