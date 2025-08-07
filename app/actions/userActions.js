// ** MODIFIED: Sửa lại toàn bộ đường dẫn import và logic truy vấn cho đúng với model
"use server";

import connectDB from "@/config/connectDB";
import History from "@/models/history.js";
import User from "@/models/users.js"; // Sửa lại thành 'users.js' cho đúng
import Customer from "@/models/customer.js";
import { unstable_noStore as noStore } from "next/cache";
import bcrypt from "bcryptjs";

const getLatestActionAggregation = (matchConditions = {}) => [
  { $match: matchConditions },
  {
    $lookup: {
      from: "actionhistories", // **SỬA LỖI**: Tên collection đúng
      localField: "_id",
      foreignField: "user",
      as: "actions",
      pipeline: [{ $sort: { time: -1 } }, { $limit: 1 }], // **SỬA LỖI**: Sắp xếp theo 'time'
    },
  },
  { $unwind: { path: "$actions", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "customers",
      localField: "actions.customer",
      foreignField: "_id",
      as: "customerInfo",
    },
  },
  { $unwind: { path: "$customerInfo", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 1,
      name: 1,
      phone: 1,
      email: 1,
      role: 1,
      createdAt: 1, // ++ ADDED: Lấy thêm trường createdAt để sắp xếp user mới tạo
      latestAction: {
        type: "$actions.action",
        time: "$actions.time",
      },
      customer: {
        _id: "$customerInfo._id",
        name: "$customerInfo.name",
        phone: "$customerInfo.phone",
      },
    },
  },
];

export async function getUsersWithDetails({ page = 1, limit = 10 }) {
  noStore();
  try {
    await connectDB();

    const skip = (page - 1) * limit;

    // Lấy tổng số user trước khi thực hiện aggregate để đảm bảo chính xác
    const totalUsers = await User.countDocuments();
    if (totalUsers === 0) {
      return { success: true, data: [], totalUsers: 0, totalPages: 0 };
    }

    const aggregationPipeline = getLatestActionAggregation();

    const users = await User.aggregate(aggregationPipeline)
      // ** MODIFIED: Sắp xếp theo thời gian hành động cuối cùng. Nếu không có, ưu tiên user mới tạo.
      .sort({ "latestAction.time": -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(users)),
      totalUsers: totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
    };
  } catch (error) {
    console.error("Error fetching users with details:", error);
    return { success: false, data: [], totalPages: 0 };
  }
}

export async function getUserDetails(userId) {
  noStore();
  try {
    await connectDB();
    // Populate zaloActive thay vì zaloAccounts
    const user = await User.findById(userId).populate("zaloActive").lean();
    if (!user) return null;

    // Tìm tất cả các ZaloAccount có user này được gán
    const ZaloAccount = require("@/models/zalo").default;
    const assignedZalos = await ZaloAccount.find({ users: userId }).lean();
    user.zaloAccounts = assignedZalos;

    return JSON.parse(JSON.stringify(user));
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}
/**
 * Cập nhật thông tin chi tiết cho một user.
 * @param {string} userId - ID của user.
 * @param {object} dataToUpdate - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Kết quả thực thi.
 */
export async function updateUserDetails(userId, dataToUpdate) {
  try {
    await connectToDB();
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: dataToUpdate },
      { new: true, runValidators: true },
    );
    if (!updatedUser) throw new Error("Không tìm thấy user để cập nhật.");
    // Không cần revalidate vì đây là trang admin, sẽ tự làm mới
    return { success: true, data: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Tạo một người dùng mới trong hệ thống.
 * @param {object} userData - Dữ liệu của user mới (name, email, phone, password).
 * @returns {Promise<object>} Kết quả thực thi.
 */
export async function createUser(userData) {
  try {
    await connectToDB();
    const { name, email, phone, password } = userData;

    if (!name || !email || !password) {
      throw new Error("Tên, Email, và Mật khẩu là bắt buộc.");
    }

    // Mã hóa mật khẩu trước khi lưu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "Employee", // Mặc định role là Employee
    });

    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error) {
    // Xử lý lỗi trùng email
    if (error.code === 11000) {
      return { success: false, error: "Email đã tồn tại trong hệ thống." };
    }
    return { success: false, error: error.message };
  }
}

// ++ ADDED: Hàm mới để xóa user
/**
 * Xóa một người dùng khỏi hệ thống.
 * @param {string} userId - ID của user cần xóa.
 * @returns {Promise<object>} Kết quả thực thi.
 */
export async function deleteUser(userId) {
  try {
    await connectToDB();
    // Thêm logic kiểm tra quyền hạn ở đây nếu cần, ví dụ: chỉ Admin mới được xóa
    await User.findByIdAndDelete(userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
