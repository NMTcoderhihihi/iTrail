// File: data/user/user.actions.js
"use server";

import connectDB from "@/config/connectDB";
import User from "@/models/users.js";
import ZaloAccount from "@/models/zalo.js";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import bcrypt from "bcryptjs";

/**
 * Tạo một người dùng mới.
 */
export async function createUser(userData) {
  try {
    await connectDB();
    const { name, email, phone, password, role = "Employee" } = userData;

    if (!name || !email || !password) {
      throw new Error("Tên, Email, và Mật khẩu là bắt buộc.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    });

    revalidateAndBroadcast("users_list");
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, error: "Email đã tồn tại." };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Cập nhật thông tin chi tiết cho một user.
 */
export async function updateUserDetails(userId, dataToUpdate) {
  try {
    await connectDB();
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: dataToUpdate },
      { new: true, runValidators: true },
    );
    if (!updatedUser) throw new Error("Không tìm thấy user để cập nhật.");

    revalidateAndBroadcast("users_list");
    return { success: true, data: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một người dùng.
 */
export async function deleteUser(userId) {
  try {
    await connectDB();
    await User.findByIdAndDelete(userId);

    // Cũng cần xóa user này khỏi mảng 'users' trong các ZaloAccount
    await ZaloAccount.updateMany(
      { users: userId },
      { $pull: { users: userId } },
    );

    revalidateAndBroadcast("users_list");
    revalidateAndBroadcast("zalo_accounts");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
