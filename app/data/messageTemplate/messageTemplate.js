// ++ ADDED: Toàn bộ file này là mới
"use server";

import connectDB from "@/config/connectDB";
import MessageTemplate from "@/models/messageTemplate";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

/**
 * Lấy danh sách các mẫu tin nhắn (message templates) với phân trang.
 * @param {object} options - Tùy chọn phân trang.
 * @param {number} [options.page=1] - Trang hiện tại.
 * @param {number} [options.limit=10] - Số lượng mục mỗi trang.
 * @returns {Promise<object>} - Dữ liệu mẫu tin và thông tin phân trang.
 */
export async function getMessageTemplates({ page = 1, limit = 10 } = {}) {
  try {
    await connectDB();
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      MessageTemplate.find({})
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageTemplate.countDocuments({}),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(templates)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  } catch (error) {
    return { success: false, error: error.message, data: [], pagination: {} };
  }
}
/**
 * Lấy danh sách tất cả các mẫu tin nhắn cho dropdown.
 * @returns {Promise<Array>}
 */
export async function getMessageTemplatesForFilter() {
  try {
    await connectDB();
    const templates = await MessageTemplate.aggregate([
      {
        $project: {
          _id: 1,
          content: 1,
          // Sử dụng $ifNull: nếu 'description' tồn tại, dùng nó. Nếu không, dùng 'title'.
          description: { $ifNull: ["$description", "$title"] },
        },
      },
      {
        $sort: {
          description: 1,
        },
      },
    ]);
    return JSON.parse(JSON.stringify(templates));
  } catch (error) {
    console.error("Loi trong getMessageTemplatesForFilter:", error);
    return [];
  }
}

/**
 * Tạo mới hoặc cập nhật một mẫu tin nhắn.
 * @param {object} data - Dữ liệu của mẫu tin.
 * @param {string} [data.id] - ID của mẫu tin nếu là cập nhật.
 * @param {string} data.name - Tên định danh (không dấu, không khoảng trắng).
 * @param {string} data.description - Mô tả chi tiết.
 * @param {string} data.content - Nội dung mẫu tin.
 * @returns {Promise<object>} - Kết quả thực thi.
 */
export async function createOrUpdateTemplate(data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Yêu cầu đăng nhập để thực hiện hành động này.");
    }

    const { id, name, description, content } = data;

    if (!name || !description) {
      throw new Error("Tên định danh và mô tả là bắt buộc.");
    }

    // Chuẩn hóa `name` để đảm bảo tính duy nhất
    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, "_");

    const templateData = {
      name: normalizedName,
      description,
      content,
      createdBy: currentUser.id,
    };

    let savedTemplate;
    if (id) {
      // Cập nhật
      savedTemplate = await MessageTemplate.findByIdAndUpdate(
        id,
        templateData,
        {
          new: true,
        },
      ).lean();
      if (!savedTemplate)
        throw new Error("Không tìm thấy mẫu tin để cập nhật.");
    } else {
      // Tạo mới
      savedTemplate = await MessageTemplate.create(templateData);
    }

    revalidateAndBroadcast("messagetemplates");

    return { success: true, data: JSON.parse(JSON.stringify(savedTemplate)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một mẫu tin nhắn.
 * @param {string} templateId - ID của mẫu tin cần xóa.
 * @returns {Promise<object>} - Kết quả thực thi.
 */
export async function deleteTemplate(templateId) {
  try {
    if (!templateId) throw new Error("Cần cung cấp ID của mẫu tin.");
    await connectDB();

    const deleted = await MessageTemplate.findByIdAndDelete(templateId);
    if (!deleted) throw new Error("Không tìm thấy mẫu tin để xóa.");

    revalidateAndBroadcast("messagetemplates");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
