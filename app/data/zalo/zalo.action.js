// ++ ADDED: Toàn bộ file này là mới, hợp nhất các logic liên quan đến Zalo
"use server";

import connectDB from "@/config/connectDB";
import User from "@/models/users";
import ZaloAccount from "@/models/zalo";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";
import { google } from "googleapis";

// --- CÁC HÀM TRUY VẤN (QUERIES) ---

async function getGoogleSheetsClient(isWrite = false) {
  const scopes = isWrite
    ? ["https://www.googleapis.com/auth/spreadsheets"]
    : ["https://www.googleapis.com/auth/spreadsheets.readonly"];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes,
  });
  return google.sheets({ version: "v4", auth });
}

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
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}

export async function getZaloAccountDetails(accountId) {
  try {
    await connectDB();
    const account = await ZaloAccount.findById(accountId)
      .populate("users", "name email phone role")
      .lean();
    if (!account) return null;
    return JSON.parse(JSON.stringify(account));
  } catch (error) {
    return null;
  }
}

export async function getTokenFromSheetByUid(uid) {
  try {
    const sheets = await getGoogleSheetsClient(false);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1H5Z1OJxzvk39vjtrdDYzESU61NV7DGPw6K_iD97nh7U",
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

// --- CÁC HÀM HÀNH ĐỘNG (ACTIONS) ---

export async function createOrUpdateAccountByToken(token) {
  try {
    if (!token) throw new Error("Token là bắt buộc.");
    await connectDB();

    const scriptResponse = await fetch(
      "https://script.google.com/macros/s/AKfycbwcaXcpdsonX5eGRd0T-X_yJejKqD0krSSSV3rYDnpot23nWvXkzO3QnnvIo7UqYss1/exec",
      {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      },
    );

    const accountData = await scriptResponse.json();
    if (!scriptResponse.ok || accountData.error || !accountData.userId) {
      throw new Error("Lỗi từ Apps Script hoặc token không hợp lệ.");
    }

    const dataForMongo = {
      uid: accountData.userId,
      name: accountData.name,
      phone: accountData.phone,
      avt: accountData.avatar,
      isTokenActive: true,
    };

    const updatedAccount = await ZaloAccount.findOneAndUpdate(
      { uid: dataForMongo.uid },
      { $set: dataForMongo },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    revalidateAndBroadcast("zalo_accounts");
    return { success: true, data: JSON.parse(JSON.stringify(updatedAccount)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function setActiveZalo(zaloAccountId) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const activeId = zaloAccountId || null;

    if (activeId) {
      const hasAccess = await ZaloAccount.findOne({
        _id: activeId,
        users: currentUser.id,
      });
      if (!hasAccess) {
        throw new Error("Không có quyền truy cập tài khoản Zalo này.");
      }
    }

    await User.findByIdAndUpdate(currentUser.id, {
      $set: { zaloActive: activeId },
    });
    revalidateAndBroadcast("user_session");
    return { success: true, message: "Đã cập nhật tài khoản Zalo." };
  } catch (error) {
    return { error: error.message };
  }
}

export async function toggleUserAccess(accountId, userId) {
  try {
    await connectDB();
    const account = await ZaloAccount.findById(accountId);
    if (!account) throw new Error("Không tìm thấy tài khoản Zalo.");

    const userIndex = account.users.findIndex((id) => id.toString() === userId);
    if (userIndex > -1) {
      account.users.splice(userIndex, 1);
    } else {
      account.users.push(userId);
    }
    await account.save();

    revalidateAndBroadcast("zalo_accounts");
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

export async function updateZaloAccountDetails(accountId, dataToUpdate) {
  try {
    await connectDB();
    const updatedAccount = await ZaloAccount.findByIdAndUpdate(
      accountId,
      { $set: dataToUpdate },
      { new: true, runValidators: true },
    );
    if (!updatedAccount)
      throw new Error("Không tìm thấy tài khoản để cập nhật.");

    revalidateAndBroadcast("zalo_accounts");
    return { success: true, data: JSON.parse(JSON.stringify(updatedAccount)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteZaloAccount(accountId) {
  try {
    await connectDB();
    await ZaloAccount.findByIdAndDelete(accountId);
    revalidateAndBroadcast("zalo_accounts");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
