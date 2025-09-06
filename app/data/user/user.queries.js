// File: data/user/user.queries.js
"use server";

import connectDB from "@/config/connectDB";
import User from "@/models/users.js";
import ZaloAccount from "@/models/zalo.js";
import { Types } from "mongoose";

/**
 * Lấy danh sách người dùng với các thông tin chi tiết cơ bản cho trang quản trị.
 */
export async function getUsersWithDetails({ page = 1, limit = 10 }) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const totalUsers = await User.countDocuments();

    const users = await User.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "actionhistories",
          localField: "_id",
          foreignField: "actorId",
          as: "latestAction",
          pipeline: [
            { $sort: { time: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "customers",
                localField: "context.value",
                foreignField: "_id",
                as: "customerInfo",
              },
            },
            {
              $unwind: {
                path: "$customerInfo",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$latestAction", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          role: 1,
          createdAt: 1,
          "latestAction.actionTypeId": 1,
          "latestAction.time": 1,
          "latestAction.customer": "$latestAction.customerInfo",
        },
      },
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(users)),
      totalUsers: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], totalPages: 0 };
  }
}

/**
 * Lấy thông tin chi tiết đầy đủ của một người dùng cho panel chi tiết.
 */
export async function getUserDetails(userId) {
  try {
    if (!userId || !Types.ObjectId.isValid(userId)) return null;
    await connectDB();
    const user = await User.findById(userId, "-password")
      .populate("zaloActive", "name phone avt")
      .lean();
    if (!user) return null;

    user.zaloAccounts = await ZaloAccount.find({ users: user._id }).lean();
    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error("Loi trong getUserDetails:", error);
    return null;
  }
}

/**
 * Lấy danh sách tất cả người dùng để hiển thị trong bộ lọc (dành cho Admin).
 */
export async function getUsersForFilter() {
  try {
    await connectDB();
    const users = await User.find({})
      .select("_id name email")
      .sort({ name: 1 })
      .lean();
    return JSON.parse(JSON.stringify(users));
  } catch (error) {
    console.error("Loi trong getUsersForFilter:", error);
    return [];
  }
}
