// [MOD] app/data/auth/auth.actions.js

"use server";

import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
// [DEL] Bỏ import redirect vì client sẽ xử lý
import connectDB from "@/config/connectDB";
import User from "@/models/users";
// [NOTE] Hàm logAction giữ nguyên, không thay đổi
import { logAction } from "../history/history.actions.js";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "token";

/**
 * Xử lý logic đăng nhập cho người dùng.
 * @param {object} prevState - Trạng thái trước đó từ useFormState.
 * @param {FormData} formData - Dữ liệu từ form.
 */
// [MOD] Thay đổi chữ ký hàm để tương thích useFormState
export async function loginUser(prevState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");

  const requestHeaders = headers();
  const ipAddress = requestHeaders.get("x-forwarded-for") || "unknown";
  const userAgent = requestHeaders.get("user-agent") || "unknown";

  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (!user) {
      // [MOD] Trả về object lỗi thay vì ném lỗi
      return { error: "Tài khoản không tồn tại!" };
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      // [MOD] Trả về object lỗi thay vì ném lỗi
      return { error: "Mật khẩu không chính xác!" };
    }

    const tokenData = { id: user._id.toString(), role: user.role };
    const accessToken = await new SignJWT(tokenData)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5h")
      .sign(JWT_SECRET);

    cookies().set(COOKIE_NAME, accessToken, {
      httpOnly: true,
      path: "/",
      maxAge: 5 * 60 * 60, // 5 giờ
    });

    // [NOTE] Việc ghi log không thay đổi
    await logAction({
      actionType: "user_login",
      actorId: user._id,
      detail: { ipAddress, userAgent, status: "success" },
    });

    // [MOD] Trả về object thành công để client xử lý redirect
    return { success: true, role: user.role };
  } catch (err) {
    const userForLog = await User.findOne({ email }).lean();
    if (userForLog) {
      await logAction({
        actionType: "user_login_failed",
        actorId: userForLog._id,
        detail: { ipAddress, userAgent, reason: err.message },
      });
    }
    return { error: err.message };
  }
}

/**
 * Xử lý logic đăng xuất.
 */
// [DEL] Xóa hàm logoutUser khỏi đây và chuyển vào file riêng để rõ ràng hơn
// export async function logoutUser() { ... }
