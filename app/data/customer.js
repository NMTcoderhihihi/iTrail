// ++ MODIFIED: Toàn bộ file này được tái cấu trúc để sử dụng Aggregation Pipeline
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import Label from "@/models/messageTemplate";
import Status from "@/models/status";
import User from "@/models/users";
import CareProgram from "@/models/careProgram"; // ++ ADDED: Import model mới
import { Types } from "mongoose";

/**
 * Hàm truy vấn khách hàng nâng cao, hỗ trợ nhiều bộ lọc phức tạp.
 * @param {object} searchParams - Các tham số lọc từ client.
 * @param {object} currentUser - Thông tin người dùng đang đăng nhập.
 * @returns {Promise<object>} - Dữ liệu khách hàng và thông tin phân trang.
 */
export async function Data_Client(searchParams = {}, currentUser = null) {
  try {
    await connectDB();

    const page = parseInt(searchParams.page) || 1;
    const limit = parseInt(searchParams.limit) || 50;
    const skip = (page - 1) * limit;

    // --- Xây dựng bộ lọc $match mạnh mẽ ---
    const matchStage = {};

    // 1. Lọc theo User (dựa trên vai trò)
    if (currentUser && currentUser.role !== "Admin") {
      matchStage.users = new Types.ObjectId(currentUser.id);
    } else if (searchParams.userId) {
      // Cho phép Admin lọc theo một user cụ thể
      matchStage.users = new Types.ObjectId(searchParams.userId);
    }

    // 2. Lọc theo text search (tên, sđt, cccd)
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
      matchStage.tags = { $in: tagIds };
    }

    // 4. Lọc theo Chương trình, Giai đoạn, Trạng thái
    const enrollmentFilters = {};
    if (searchParams.programId) {
      enrollmentFilters.programId = new Types.ObjectId(searchParams.programId);
    }
    if (searchParams.stageId) {
      enrollmentFilters.stageId = new Types.ObjectId(searchParams.stageId);
    }
    if (searchParams.statusId) {
      enrollmentFilters.statusId = new Types.ObjectId(searchParams.statusId);
    }
    if (Object.keys(enrollmentFilters).length > 0) {
      matchStage.programEnrollments = { $elemMatch: enrollmentFilters };
    }

    // 5. Lọc theo UID và Zalo Account
    if (searchParams.uidStatus && searchParams.uidFilterZaloId) {
      const zaloId = new Types.ObjectId(searchParams.uidFilterZaloId);
      switch (searchParams.uidStatus) {
        case "found":
          matchStage.uid = { $elemMatch: { zaloId, uid: { $regex: /^\d+$/ } } };
          break;
        case "error":
          matchStage.uid = { $elemMatch: { zaloId, uid: { $not: /^\d+$/ } } };
          break;
        case "pending":
          matchStage["uid.zaloId"] = { $ne: zaloId };
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
        // Populate dữ liệu sau khi đã phân trang
        {
          $lookup: {
            from: "users",
            localField: "users",
            foreignField: "_id",
            as: "users",
            pipeline: [{ $project: { name: 1, email: 1 } }], // Chỉ lấy trường cần thiết
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
        // Populate lồng nhau cho programEnrollments
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
            as: "programEnrollments.programDetails",
          },
        },
        {
          $unwind: {
            path: "$programEnrollments.programDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Gom nhóm lại sau khi populate
        {
          $group: {
            _id: "$_id",
            // Giữ lại các trường gốc
            name: { $first: "$name" },
            phone: { $first: "$phone" },
            citizenId: { $first: "$citizenId" },
            uid: { $first: "$uid" },
            comments: { $first: "$comments" },
            action: { $first: "$action" },
            customerAttributes: { $first: "$customerAttributes" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" },
            users: { $first: "$users" },
            tags: { $first: "$tags" },
            // Gom mảng programEnrollments lại
            programEnrollments: { $push: "$programEnrollments" },
          },
        },
        { $sort: { createdAt: -1 } }, // Sắp xếp lại lần nữa sau khi group
      ]),
      Customer.countDocuments(matchStage),
    ]);

    // Xử lý dữ liệu trả về để lấy đúng status và stage name
    const finalData = clientsFromDB.map((customer) => {
      const enrollment = customer.programEnrollments?.[0]; // Giả sử mỗi KH chỉ có 1 enrollment tại 1 thời điểm
      if (enrollment && enrollment.programDetails) {
        const status = enrollment.programDetails.statuses.find((s) =>
          s._id.equals(enrollment.statusId),
        );
        const stage = enrollment.programDetails.stages.find((s) =>
          s._id.equals(enrollment.stageId),
        );
        customer.status = status;
        customer.stage = stage;
      }
      return customer;
    });

    return {
      data: JSON.parse(JSON.stringify(finalData)),
      pagination: {
        page,
        limit,
        total: totalClients,
        totalPages: Math.ceil(totalClients / limit),
      },
    };
  } catch (error) {
    console.error("Loi trong Data_Client:", error);
    return {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  }
}

/**
 * Lấy tất cả các nhãn (labels) từ DB.
 */
export async function Data_Label() {
  try {
    await connectDB();
    const labels = await Label.find({}).lean();
    return { data: JSON.parse(JSON.stringify(labels)) };
  } catch (error) {
    console.error("Loi trong Data_Label:", error);
    return { data: [] };
  }
}

/**
 * Lấy tất cả các trạng thái (statuses) từ DB.
 * **Lưu ý:** Hàm này có thể sẽ được điều chỉnh để lấy status từ `CareProgram` trong tương lai.
 */
export async function Data_Status() {
  try {
    await connectDB();
    // Tạm thời vẫn lấy từ collection Status cũ để tương thích với các phần khác
    // Sẽ được tái cấu trúc sau
    const statuses = await Status.find({}).lean();
    const sortedStatuses = statuses.sort((a, b) => {
      const matchA = a.name.match(/^QT(\d+)\|/);
      const matchB = b.name.match(/^QT(\d+)\|/);
      const orderA = matchA ? parseInt(matchA[1], 10) : Infinity;
      const orderB = matchB ? parseInt(matchB[1], 10) : Infinity;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });

    return { data: JSON.parse(JSON.stringify(sortedStatuses)) };
  } catch (error) {
    console.error("Loi trong Data_Status:", error);
    return { data: [] };
  }
}
