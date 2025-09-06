// File: data/history/history.queries.js
"use server";

import connectDB from "@/config/connectDB";
import ActionHistory from "@/models/history";
import ActionTypeDefinition from "@/models/actionTypeDefinition";
import { Types } from "mongoose";

/**
 * Lấy lịch sử hành động của một khách hàng cụ thể.
 */
export async function getHistoryForCustomer(customerId) {
  try {
    await connectDB();
    if (!Types.ObjectId.isValid(customerId)) return [];

    const historyRecords = await ActionHistory.find({
      "context.value": new Types.ObjectId(customerId),
    })
      .populate({ path: "actorId", select: "name" })
      .populate({ path: "actionTypeId", select: "actionType description" })
      .sort({ time: -1 })
      .limit(100)
      .lean();

    return JSON.parse(JSON.stringify(historyRecords));
  } catch (error) {
    console.error("Loi trong getHistoryForCustomer:", error);
    return [];
  }
}

/**
 * Lấy lịch sử thực thi của một chiến dịch (schedule) cụ thể.
 */
export async function getHistoryForSchedule(scheduleId) {
  try {
    await connectDB();
    if (!Types.ObjectId.isValid(scheduleId)) return [];

    const scheduleObjectId = new Types.ObjectId(scheduleId);

    const definitions = await ActionTypeDefinition.find({
      actionType: /^do_schedule_/,
    }).lean();
    const executionActionTypeIds = definitions.map((def) => def._id);

    const historyRecords = await ActionHistory.find({
      actionTypeId: { $in: executionActionTypeIds },
      "context.key": "scheduleId",
      "context.value": scheduleObjectId,
    })
      .populate({ path: "actorId", select: "name" })
      .populate({
        path: "context.value",
        match: { "context.key": "customerId" },
        model: "Customer",
        select: "name phone",
      })
      .sort({ time: -1 })
      .lean();

    return JSON.parse(JSON.stringify(historyRecords));
  } catch (error) {
    console.error("Loi trong getHistoryForSchedule:", error);
    return [];
  }
}
