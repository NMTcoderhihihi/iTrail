// File: data/dataSource/dataSource.actions.js
"use server";

import connectDB from "@/config/connectDB";
import DataSource from "@/models/dataSource";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";
import { google } from "googleapis";

/**
 * Hàm nguyên thủy MỚI để cập nhật dữ liệu hàng loạt vào Google Sheet.
 */
export async function writeToGoogleSheet({ spreadsheetId, range, values }) {
  if (!spreadsheetId || !range || !Array.isArray(values)) {
    throw new Error("spreadsheetId, range, and values array are required.");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  return response.data;
}

/**
 * Tạo mới hoặc cập nhật một DataSource.
 */
export async function createOrUpdateDataSource(data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const { id, ...updateData } = data;
    updateData.createdBy = currentUser.id;

    if (
      updateData.connectionConfig &&
      !Array.isArray(updateData.connectionConfig.processingPipeline)
    ) {
      updateData.connectionConfig.processingPipeline = [];
    }

    let savedDataSource;
    if (id) {
      savedDataSource = await DataSource.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).lean();
    } else {
      savedDataSource = await DataSource.create(updateData);
    }

    revalidateAndBroadcast("datasources");
    return { success: true, data: JSON.parse(JSON.stringify(savedDataSource)) };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        error: `Tên DataSource "${data.name}" đã tồn tại.`,
      };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một DataSource.
 */
export async function deleteDataSource(id) {
  try {
    if (!id) throw new Error("Cần cung cấp ID.");
    await connectDB();
    await DataSource.findByIdAndDelete(id);

    revalidateAndBroadcast("datasources");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
