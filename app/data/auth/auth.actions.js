// File: data/auth/auth.actions.js
"use server";

import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import connectDB from "@/config/connectDB";
import User from "@/models/users";
import { logAction } from "../history/history.actions.js"; // Cập nhật đường dẫn import nếu cần

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "token";

/**
 * Xử lý logic đăng nhập cho người dùng.
 */
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
      throw new Error("Tài khoản không tồn tại!");
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new Error("Mật khẩu không chính xác!");
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

    // Ghi log đăng nhập thành công
    await logAction({
      actionType: "user_login",
      actorId: user._id,
      detail: { ipAddress, userAgent, status: "success" },
    });

    return { success: true, role: user.role };
  } catch (err) {
    // Ghi log đăng nhập thất bại (nếu có thể lấy được user Id)
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
export async function logoutUser() {
  cookies().set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  redirect("/login");
}
