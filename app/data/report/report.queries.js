// File: data/report/report.queries.js
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import User from "@/models/users";
import ZaloAccount from "@/models/zalo";
import ScheduledJob from "@/models/schedule";
import ArchivedJob from "@/models/archivedJob";
import ActionHistory from "@/models/history";
import ReportLayout from "@/models/reportLayout";
import KpiResult from "@/models/kpiResult";
import { Types } from "mongoose";

/**
 * Lấy dữ liệu thống kê tổng quan cho dashboard của Admin.
 */
export async function getOverallReportData() {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCustomers,
      totalUsers,
      totalZaloAccounts,
      runningCampaigns,
      archivedCampaigns,
      actionsToday,
    ] = await Promise.all([
      Customer.countDocuments(),
      User.countDocuments(),
      ZaloAccount.countDocuments(),
      ScheduledJob.countDocuments(),
      ArchivedJob.countDocuments(),
      ActionHistory.countDocuments({ time: { $gte: today, $lt: tomorrow } }),
    ]);

    return {
      success: true,
      data: {
        totalCustomers,
        totalUsers,
        totalZaloAccounts,
        runningCampaigns,
        totalCampaigns: runningCampaigns + archivedCampaigns,
        actionsToday,
      },
    };
  } catch (error) {
    console.error("Error fetching overall report data:", error);
    return { success: false, error: error.message };
  }
}
export async function getEmployeeReportData({ userId }) {
  try {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new Error("User ID không hợp lệ.");
    }
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await ActionHistory.aggregate([
      // Lọc các hành động của user chỉ trong ngày hôm nay
      {
        $match: {
          actorId: new Types.ObjectId(userId),
          time: { $gte: today, $lt: tomorrow },
        },
      },
      // Gom nhóm theo actionTypeId và đếm số lượng
      {
        $group: {
          _id: "$actionTypeId",
          count: { $sum: 1 },
        },
      },
      // Kết nối (lookup) với bảng actiontypedefinitions để lấy tên action
      {
        $lookup: {
          from: "actiontypedefinitions",
          localField: "_id",
          foreignField: "_id",
          as: "actionTypeDetails",
        },
      },
      // "Bung" mảng kết quả lookup ra
      {
        $unwind: "$actionTypeDetails",
      },
      // Định hình lại output cuối cùng
      {
        $project: {
          _id: 0,
          actionType: "$actionTypeDetails.actionType",
          description: "$actionTypeDetails.description",
          count: "$count",
        },
      },
      {
        $sort: {
          count: -1, // Sắp xếp theo số lượng giảm dần
        },
      },
    ]);

    return { success: true, data: stats };
  } catch (error) {
    console.error(`Error fetching report data for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerGrowthData() {
  try {
    await connectDB();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const growthData = await Customer.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sắp xếp theo ngày
      { $project: { _id: 0, date: "$_id", count: "$count" } },
    ]);
    return { success: true, data: growthData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// [ADD] Lấy dữ liệu phân bổ các loại hành động trong 7 ngày qua
export async function getActionDistributionData() {
  try {
    await connectDB();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const distributionData = await ActionHistory.aggregate([
      { $match: { time: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$actionTypeId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "actiontypedefinitions",
          localField: "_id",
          foreignField: "_id",
          as: "actionType",
        },
      },
      { $unwind: "$actionType" },
      {
        $project: {
          _id: 0,
          label: "$actionType.actionType",
          count: "$count",
        },
      },
      { $sort: { count: -1 } },
    ]);
    return { success: true, data: distributionData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// [ADD] Lấy top 5 nhân viên hoạt động tích cực nhất trong 7 ngày qua
export async function getTopPerformingUsers() {
  try {
    await connectDB();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const topUsers = await ActionHistory.aggregate([
      { $match: { time: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$actorId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $project: { _id: 0, label: "$user.name", count: "$count" } },
    ]);
    return { success: true, data: topUsers };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
/**
 * Lấy danh sách các layout báo cáo đã được tạo.
 */
export async function getReportLayouts({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [layouts, total] = await Promise.all([
      ReportLayout.find({})
        .sort({ layoutName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReportLayout.countDocuments({}),
    ]);
    return {
      success: true,
      data: JSON.parse(JSON.stringify(layouts)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
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
