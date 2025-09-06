// File: data/zalo/zalo.queries.js
"use server";

import connectDB from "@/config/connectDB";
import ZaloAccount from "@/models/zalo";
import { Types } from "mongoose";
import { google } from "googleapis";

/**
 * Lấy danh sách các tài khoản Zalo với phân trang và thông tin chi tiết.
 * Thường dùng cho trang Admin Management.
 * @param {object} options - Tùy chọn phân trang.
 * @returns {Promise<object>}
 */
export async function getZaloAccounts({ page = 1, limit = 0 } = {}) {
  try {
    await connectDB();
    const query = ZaloAccount.find({})
      .populate("users", "name email phone role")
      .sort({ createdAt: -1 });

    if (limit > 0) {
      const skip = (page - 1) * limit;
      query.skip(skip).limit(limit);
    }

    const [accounts, total] = await Promise.all([
      query.lean(),
      ZaloAccount.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(accounts.filter(Boolean))),
      pagination:
        limit > 0
          ? { page, limit, total, totalPages: Math.ceil(total / limit) }
          : {},
    };
  } catch (error) {
    console.error("Loi trong getZaloAccounts:", error);
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}

/**
 * Lấy chi tiết một tài khoản Zalo bằng ID.
 * @param {string} accountId - ID của tài khoản Zalo.
 * @returns {Promise<object|null>}
 */
export async function getZaloAccountDetails(accountId) {
  try {
    await connectDB();
    const account = await ZaloAccount.findById(accountId)
      .populate("users", "name email phone role")
      .lean();
    if (!account) return null;
    return JSON.parse(JSON.stringify(account));
  } catch (error) {
    console.error("Loi trong getZaloAccountDetails:", error);
    return null;
  }
}

/**
 * Lấy danh sách tài khoản Zalo để hiển thị trong bộ lọc.
 * @param {object} currentUser - Thông tin người dùng đang đăng nhập.
 * @returns {Promise<Array>}
 */
export async function getZaloAccountsForFilter(currentUser) {
  try {
    await connectDB();
    if (!currentUser) return [];

    const query = {};
    if (currentUser.role !== "Admin") {
      query.users = new Types.ObjectId(currentUser.id);
    }

    const accounts = await ZaloAccount.find(query)
      .select("_id name phone")
      .sort({ name: 1 })
      .lean();

    return JSON.parse(JSON.stringify(accounts));
  } catch (error) {
    console.error("Loi trong getZaloAccountsForFilter:", error);
    return [];
  }
}

/**
 * Lấy token từ Google Sheet dựa trên UID.
 * @param {string} uid - UID của tài khoản Zalo.
 * @returns {Promise<object>}
 */
export async function getTokenFromSheetByUid(uid) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1H5Z1OJxzvk39vjtrdDYzESU61NV7DGPw6K_iD97nh7U", // Hardcoded ID
      range: `Account!B:E`,
    });

    const rows = response.data.values || [];
    for (const row of rows) {
      if (row[0] === uid) {
        return { success: true, token: row[3] };
      }
    }
    return { success: false, message: "Không tìm thấy token." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
