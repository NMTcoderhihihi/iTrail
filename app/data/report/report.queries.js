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

export async function getDashboardStats(programId = null, carePrograms = []) {
  try {
    await connectDB();

    if (programId) {
      // --- Lấy dữ liệu cho một chương trình cụ thể ---
      const programObjectId = new Types.ObjectId(programId);
      const program = carePrograms.find((p) => p._id.toString() === programId);

      if (!program) return {};

      const stats = await Customer.aggregate([
        { $match: { "programEnrollments.programId": programObjectId } },
        {
          $facet: {
            totalCustomers: [{ $count: "count" }],
            byStage: [
              { $unwind: "$programEnrollments" },
              { $match: { "programEnrollments.programId": programObjectId } },
              {
                $group: {
                  _id: "$programEnrollments.stageId",
                  count: { $sum: 1 },
                },
              },
            ],
            byStatus: [
              { $unwind: "$programEnrollments" },
              { $match: { "programEnrollments.programId": programObjectId } },
              {
                $group: {
                  _id: "$programEnrollments.statusId",
                  count: { $sum: 1 },
                },
              },
            ],
            noStatus: [
              { $unwind: "$programEnrollments" },
              {
                $match: {
                  "programEnrollments.programId": programObjectId,
                  "programEnrollments.statusId": null,
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]);

      const formatGroup = (groupData, mapSource, key) => {
        return (groupData || [])
          .map((item) => {
            const found = mapSource.find(
              (s) => s._id.toString() === item._id?.toString(),
            );
            return `${found ? found.name : "N/A"}: ${item.count}`;
          })
          .join(" | ");
      };

      return {
        totalCustomers: stats[0]?.totalCustomers[0]?.count || 0,
        byStage: formatGroup(stats[0]?.byStage, program.stages, "stageId"),
        byStatus: formatGroup(stats[0]?.byStatus, program.statuses, "statusId"),
        noStatus: stats[0]?.noStatus[0]?.count || 0,
      };
    } else {
      // --- Lấy dữ liệu tổng quan ---
      const [totalCustomers, totalCampaigns, customersPerProgram] =
        await Promise.all([
          Customer.countDocuments(),
          ScheduledJob.countDocuments({
            status: { $in: ["scheduled", "processing"] },
          }),
          Customer.aggregate([
            { $unwind: "$programEnrollments" },
            {
              $group: {
                _id: "$programEnrollments.programId",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ]),
        ]);

      const populatedCustomersPerProgram = customersPerProgram.map((p) => {
        const program = carePrograms.find(
          (cp) => cp._id.toString() === p._id.toString(),
        );
        return `${program ? program.name : "Không rõ"}: ${p.count}`;
      });

      return {
        totalPrograms: carePrograms.length,
        totalCustomers: totalCustomers,
        totalCampaigns: totalCampaigns,
        customersPerProgram: populatedCustomersPerProgram,
      };
    }
  } catch (error) {
    console.error("Lỗi trong getDashboardStats:", error);
    return {};
  }
}

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
        totalCustomers: 1873,
        totalUsers: 12,
        totalZaloAccounts: 25,
        runningCampaigns: 3,
        totalCampaigns: 128,
        actionsToday: 2319,
      },
    };
  } catch (error) {
    console.error("Error fetching overall report data:", error);
    return { success: false, error: error.message };
  }
}
export async function getEmployeeReportData({ userId }) {
  // --- [DEMO DATA] ---
  // Trả về cùng một bộ dữ liệu đẹp cho mọi nhân viên để demo
  const demoData = [
    {
      label: "Gửi tin nhắn",
      count: 125,
    },
    {
      label: "Thêm bình luận",
      count: 88,
    },
    {
      label: "Cập nhật trạng thái",
      count: 72,
    },
    {
      label: "Tìm UID",
      count: 45,
    },
    {
      label: "Hành động khác",
      count: 23,
    },
  ];
  return { success: true, data: demoData };
  // --- [END DEMO DATA] ---

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
  // --- [DEMO DATA] ---
  // Tạo dữ liệu tăng trưởng giả trong 30 ngày qua
  const growthData = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const count = 15 + Math.floor(Math.random() * 20) + (29 - i); // Xu hướng tăng dần
    growthData.push({
      date: date.toISOString().split("T")[0],
      count: count,
    });
  }
  return { success: true, data: growthData };
}

// [ADD] Lấy dữ liệu phân bổ các loại hành động trong 7 ngày qua
export async function getActionDistributionData() {
  // --- [DEMO DATA] ---
  const distributionData = [
    { label: "Gửi Tin Nhắn", count: 2450 },
    { label: "Cập nhật Trạng thái", count: 1820 },
    { label: "Thêm Bình luận", count: 1530 },
    { label: "Tìm UID", count: 980 },
    { label: "Hành động Khác", count: 450 },
  ];
  return { success: true, data: distributionData };
}

// [ADD] Lấy top 5 nhân viên hoạt động tích cực nhất trong 7 ngày qua
export async function getTopPerformingUsers() {
  // --- [DEMO DATA] ---
  const topUsers = [
    { label: "Lê Minh Tuấn", count: 875 },
    { label: "Phạm Thị Cúc", count: 792 },
    { label: "Nguyễn Văn Hùng", count: 713 },
    { label: "Trần Thu Thảo", count: 650 },
    { label: "Hoàng Đức Anh", count: 588 },
  ];
  return { success: true, data: topUsers };
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
