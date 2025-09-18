// File: data/careProgram/careProgram.queries.js
"use server";

import connectDB from "@/config/connectDB";
import CareProgram from "@/models/careProgram";
import { Types } from "mongoose";
// [ADD] Import a session management utility
import { getCurrentUser } from "@/lib/session";

/**
 * Lấy danh sách các chương trình chăm sóc (có phân trang) cho trang quản trị.
 */
export async function getCarePrograms({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [programs, total] = await Promise.all([
      CareProgram.find({})
        .populate("users", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CareProgram.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(programs)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách các chương trình chăm sóc để hiển thị trong bộ lọc.
 * Tự động xử lý phân quyền: Admin thấy tất cả, Employee chỉ thấy những gì được gán.
 */
// [MOD] Xóa tham số currentUser, hàm sẽ tự lấy từ session
export async function getCareProgramsForFilter() {
  try {
    await connectDB();
    // [MOD] Tự gọi getCurrentUser bên trong hàm
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const query = {};
    // [MOD] Logic phân quyền dựa trên vai trò
    if (currentUser.role !== "Admin") {
      query.users = new Types.ObjectId(currentUser.id);
    }

    const programs = await CareProgram.find(query)
      .select("_id name stages statuses")
      .sort({ name: 1 })
      .lean();

    return JSON.parse(JSON.stringify(programs));
  } catch (error) {
    console.error("Loi trong getCareProgramsForFilter:", error);
    return [];
  }
}
