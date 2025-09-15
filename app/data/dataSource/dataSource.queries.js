// File: data/dataSource/dataSource.queries.js
"use server";

import connectDB from "@/config/connectDB";
import DataSource from "@/models/dataSource";

/**
 * Lấy danh sách các DataSources với phân trang.
 */
export async function getDataSources({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;

    const [sources, total] = await Promise.all([
      DataSource.find({})
        .populate("createdBy", "name")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DataSource.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(sources)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}

/**
 * Lấy chi tiết một DataSource bằng ID.
 */
export async function getDataSourceById(id) {
  try {
    if (!id) throw new Error("Yêu cầu cung cấp ID.");
    await connectDB();
    const dataSource = await DataSource.findById(id).lean();
    if (!dataSource)
      return { success: false, error: "Không tìm thấy DataSource." };
    return { success: true, data: JSON.parse(JSON.stringify(dataSource)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// [ADD] Hàm mới để lấy danh sách rút gọn cho bộ lọc/chọn lựa
/**
 * Lấy danh sách rút gọn tất cả các DataSources.
 */
export async function getDataSourcesForFilter() {
  try {
    await connectDB();
    const dataSources = await DataSource.find({})
      .select("_id name")
      .sort({ name: 1 })
      .lean();
    return JSON.parse(JSON.stringify(dataSources));
  } catch (error) {
    console.error("Loi trong getDataSourcesForFilter:", error);
    return [];
  }
}
