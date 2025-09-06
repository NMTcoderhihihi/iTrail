// File: data/schedule/schedule.queries.js
"use server";

import connectDB from "@/config/connectDB";
import ScheduledJob from "@/models/schedule";
import ArchivedJob from "@/models/archivedJob";

/**
 * Lấy danh sách các chiến dịch đang chạy.
 */
export async function getRunningJobs({ page = 1, limit = 10 }) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const query = { status: { $in: ["scheduled", "processing"] } };

    const [jobs, total] = await Promise.all([
      ScheduledJob.find(query)
        .populate("createdBy", "name email")
        .populate("zaloAccount", "name phone avt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ScheduledJob.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(jobs)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}

/**
 * Lấy danh sách các chiến dịch đã lưu trữ.
 */
export async function getArchivedJobs({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      ArchivedJob.find({})
        .populate("createdBy", "name email")
        .populate("zaloAccount", "name phone avt")
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ArchivedJob.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(jobs)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}
