// ++ ADDED: Toàn bộ file này là mới và chứa logic "Data Aggregation Engine"
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import FieldDefinition from "@/models/fieldDefinition";
import { executeDataSource } from "../dataSource/dataSource.service";
import { Types } from "mongoose";
import CareProgram from "@/models/careProgram";
import User from "@/models/users";
import Tag from "@/models/tag";
import { getCurrentUser } from "@/lib/session";
import { revalidateAndBroadcast } from "@/lib/revalidation";

/**
 * Lấy chi tiết đầy đủ của một khách hàng, bao gồm cả việc "làm giàu" dữ liệu
 * từ các DataSource được định nghĩa, có hỗ trợ ưu tiên nguồn và fallback.
 * @param {string} customerId - ID của khách hàng.
 * @returns {Promise<object|null>} - Object chi tiết khách hàng hoặc null nếu không tìm thấy.
 */
export async function getCustomerDetails(customerId) {
  try {
    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      throw new Error("ID khách hàng không hợp lệ.");
    }

    await connectDB();

    // --- BƯỚC 1: LẤY DỮ LIỆU GỐC & CÁC TRƯỜNG CẦN LÀM GIÀU ---
    // [MOD] Thay đổi cách query để populate trực tiếp chương trình chăm sóc
    const customer = await Customer.findById(customerId)
      .populate("users", "name")
      .populate("tags", "name")
      .populate({
        path: "programEnrollments.programId",
        model: CareProgram,
        select: "name stages statuses",
      })
      .populate({
        // Populate thông tin user trong comment
        path: "comments.user",
        model: User,
        select: "name",
      })
      .lean();

    if (!customer) return null;

    const programIds = (customer.programEnrollments || [])
      .map((e) => e.programId?._id)
      .filter(Boolean);
    const tagIds = (customer.tags || []).map((t) => t._id);

    const fieldDefinitions = await FieldDefinition.find({
      $or: [{ programIds: { $in: programIds } }, { tagIds: { $in: tagIds } }],
    }).lean();

    customer.fieldDefinitions = fieldDefinitions;

    const dataSourcesToRun = fieldDefinitions.filter(
      (def) => (def.dataSourceIds?.length || 0) > 0,
    );
    if (dataSourcesToRun.length === 0) {
      return JSON.parse(JSON.stringify(customer));
    }

    // [FIX] Logic làm giàu dữ liệu
    const dataSourceIds = [
      ...new Set(
        dataSourcesToRun.flatMap((def) =>
          def.dataSourceIds.map((id) => id.toString()),
        ),
      ),
    ];

    const dataSourcePromises = dataSourceIds.map((id) =>
      executeDataSource({
        dataSourceId: id,
        params: { phone: customer.phone, citizenId: customer.citizenId },
      }),
    );

    const results = await Promise.all(dataSourcePromises);
    console.log("[Customer Action] Raw results from all DataSources:", results);
    const resultsByDataSourceId = dataSourceIds.reduce((acc, id, index) => {
      if (results[index] && !results[index].error) {
        acc[id] = Array.isArray(results[index])
          ? results[index][0]
          : results[index];
      } else {
        acc[id] = {};
      }
      return acc;
    }, {});

    // Gán giá trị từ datasource vào customer attributes
    for (const def of fieldDefinitions) {
      for (const dsId of def.dataSourceIds || []) {
        const resultData = resultsByDataSourceId[dsId.toString()];
        // [ADD] Log để kiểm tra dữ liệu làm giàu
        console.log(
          `[Customer Action] Enriching field '${def.fieldName}'. Data from source:`,
          resultData,
        );
        if (resultData && resultData[def.fieldName] !== undefined) {
          const existingAttrIndex = (
            customer.customerAttributes || []
          ).findIndex(
            (attr) => attr.definitionId.toString() === def._id.toString(),
          );
          if (existingAttrIndex === -1) {
            // Chỉ gán nếu chưa có giá trị do người dùng nhập
            if (!customer.customerAttributes) customer.customerAttributes = [];
            customer.customerAttributes.push({
              definitionId: def._id,
              value: [resultData[def.fieldName]],
              createdBy: ADMIN_ID, // [NOTE] Tạm thời gán cho Admin
            });
          }
          break;
        }
      }
    }

    return JSON.parse(JSON.stringify(customer));
  } catch (error) {
    console.error(`Loi trong getCustomerDetails cho ID ${customerId}:`, error);
    return null;
  }
}

/**
 * Thêm hoặc cập nhật một giá trị thuộc tính động cho khách hàng.
 */
export async function updateCustomerAttribute({
  customerId,
  definitionId,
  value,
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");
    await connectDB();

    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error("Không tìm thấy khách hàng.");

    const attributeIndex = (customer.customerAttributes || []).findIndex(
      (attr) => attr.definitionId.toString() === definitionId,
    );

    const newValue = {
      definitionId,
      value: [value], // Luôn lưu dưới dạng mảng
      createdBy: currentUser.id,
      createdAt: new Date(),
    };

    if (attributeIndex > -1) {
      customer.customerAttributes[attributeIndex] = newValue;
    } else {
      customer.customerAttributes.push(newValue);
    }

    await customer.save();
    revalidateAndBroadcast(`customer_details_${customerId}`);
    return { success: true, data: JSON.parse(JSON.stringify(customer)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Cập nhật danh sách tags cho một khách hàng.
 */
export async function updateCustomerTags({ customerId, tagIds }) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $set: { tags: tagIds } },
      { new: true },
    );

    if (!updatedCustomer) {
      throw new Error("Không tìm thấy khách hàng.");
    }

    // Ghi log hành động (tùy chọn, có thể thêm sau)
    // await logAction({...});

    revalidateAndBroadcast("customer_details");
    revalidateAndBroadcast("customer_list"); // Cập nhật cả danh sách ngoài
    return { success: true, data: JSON.parse(JSON.stringify(updatedCustomer)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function addCommentToCustomer({ customerId, detail }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");
    await connectDB();

    const newComment = {
      user: currentUser.id,
      detail: detail,
      time: new Date(),
    };

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $push: { comments: { $each: [newComment], $position: 0 } } },
      { new: true },
    );

    revalidateAndBroadcast(`customer_details_${customerId}`);
    return { success: true, data: JSON.parse(JSON.stringify(updatedCustomer)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
/**
 * Gán (hoặc ghi đè) danh sách nhân viên cho nhiều khách hàng.
 */
export async function assignUsersToCustomers({ customerIds, userIds }) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.role !== "Admin")
      throw new Error("Không có quyền thực hiện.");
    await connectDB();

    const result = await Customer.updateMany(
      { _id: { $in: customerIds } },
      // Dùng $addToSet để tránh trùng lặp user trong một khách hàng
      { $addToSet: { users: { $each: userIds } } },
    );

    revalidateAndBroadcast("customer_details");
    revalidateAndBroadcast("customer_list");
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
