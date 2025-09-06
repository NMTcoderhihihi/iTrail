// File: data/report/report.queries.js
"use server";

import connectDB from "@/config/connectDB";
import ReportLayout from "@/models/reportLayout";
import KpiResult from "@/models/kpiResult";

/**
 * Lấy danh sách các layout báo cáo đã được tạo.
 */
export async function getReportLayouts({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [layouts, total] = await Promise.all([
      ReportLayout.find({}).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      ReportLayout.countDocuments({}),
    ]);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(layouts)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Lấy chi tiết một layout báo cáo bằng ID.
 */
export async function getReportLayoutById(id) {
  try {
    await connectDB();
    const layout = await ReportLayout.findById(id).lean();
    if (!layout) throw new Error("Không tìm thấy layout báo cáo.");
    return { success: true, data: JSON.parse(JSON.stringify(layout)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách các kết quả báo cáo đã lưu (snapshot).
 */
export async function getKpiResults({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [results, total] = await Promise.all([
      KpiResult.find({})
        .populate("layoutId", "layoutName")
        .populate("exportedBy", "name")
        .sort({ exportedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      KpiResult.countDocuments({}),
    ]);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(results)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
