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
 * Lấy chi tiết đầy đủ của một khách hàng, bao gồm việc lắp ráp và làm giàu dữ liệu động.
 */
export async function getCustomerDetails(customerId) {
  try {
    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      throw new Error("ID khách hàng không hợp lệ.");
    }

    await connectDB();
    const currentUser = await getCurrentUser(); // Lấy user hiện tại để dùng sau

    // --- BƯỚC 1: LẤY BỐI CẢNH ---
    // Lấy dữ liệu thô của khách hàng và các thông tin liên quan
    const customer = await Customer.findById(customerId)
      .populate("users", "name")
      .populate("tags", "name")
      .populate({
        path: "programEnrollments.programId",
        model: CareProgram,
        select: "name stages statuses",
      })
      .populate({ path: "comments.user", model: User, select: "name" })
      .lean();

    if (!customer) return null;

    // Chuẩn bị các ID để truy vấn FieldDefinitions
    const customerTagIds = (customer.tags || []).map((t) => t._id.toString());
    const customerProgramIds = (customer.programEnrollments || [])
      .map((e) => e.programId?._id.toString())
      .filter(Boolean);

    // --- BƯỚC 2: XÁC ĐỊNH CÁC TRƯỜNG DỮ LIỆU CẦN HIỂN THỊ ---
    const allPossibleDefs = await FieldDefinition.find({
      $or: [
        { tagIds: { $in: customerTagIds.map((id) => new Types.ObjectId(id)) } },
        {
          programIds: {
            $in: customerProgramIds.map((id) => new Types.ObjectId(id)),
          },
        },
      ],
    }).lean();

    const definitionsToDisplay = allPossibleDefs.filter((def) => {
      const requiredTags = (def.tagIds || []).map((t) => t.toString());
      const requiredPrograms = (def.programIds || []).map((p) => p.toString());
      const hasTags =
        requiredTags.length === 0 ||
        requiredTags.some((rt) => customerTagIds.includes(rt));
      const hasPrograms =
        requiredPrograms.length === 0 ||
        requiredPrograms.some((rp) => customerProgramIds.includes(rp));

      if (def.displayCondition === "ALL") {
        return hasTags && hasPrograms;
      }
      return hasTags || hasPrograms; // Mặc định là 'ANY'
    });

    // --- BƯỚC 3: LÀM GIÀU & LẮP RÁP DỮ LIỆU ---
    const allDataSourceIds = [
      ...new Set(
        definitionsToDisplay.flatMap((def) =>
          (def.dataSourceIds || []).map((id) => id.toString()),
        ),
      ),
    ];

    const dataSourcePromises = allDataSourceIds.map((id) =>
      executeDataSource({
        dataSourceId: id,
        params: { phone: customer.phone, citizenId: customer.citizenId },
      }),
    );
    const dataSourceResults = Object.fromEntries(
      await Promise.all(
        allDataSourceIds.map(async (id, index) => [
          id,
          await dataSourcePromises[index],
        ]),
      ),
    );

    // Chuẩn bị các mảng để lắp ráp
    customer.customerAttributes = [];
    customer.programEnrollments = customer.programEnrollments.map((e) => ({
      ...e,
      programData: [],
    }));

    for (const def of definitionsToDisplay) {
      let finalValue = undefined;

      // Ưu tiên 1: Lấy giá trị từ DataSource
      for (const dsId of def.dataSourceIds || []) {
        const result = dataSourceResults[dsId.toString()];
        if (result && result[def.fieldName] !== undefined) {
          finalValue = result[def.fieldName];
          break; // Tìm thấy giá trị từ source ưu tiên cao nhất, dừng lại
        }
      }

      // Nếu không tìm thấy từ DataSource, bỏ qua (theo yêu cầu của bạn)
      // Nếu có giá trị, lắp nó vào đúng scope
      if (finalValue !== undefined) {
        const attribute = {
          definitionId: def._id,
          value: [finalValue],
          // Gán tạm createdBy/createdAt, có thể bỏ nếu không cần
          createdBy: currentUser.id,
          createdAt: new Date(),
        };

        if (def.scope === "CUSTOMER") {
          customer.customerAttributes.push(attribute);
        } else if (def.scope === "PROGRAM") {
          customer.programEnrollments.forEach((enrollment) => {
            // Chỉ thêm vào program enrollment có programId khớp
            if (
              (def.programIds || [])
                .map(String)
                .includes(enrollment.programId?._id.toString())
            ) {
              enrollment.programData.push(attribute);
            }
          });
        }
      }
    }

    // --- BƯỚC 4: HOÀN THIỆN DỮ LIỆU TRẢ VỀ ---
    // Gắn thông tin stage/status vào enrollment sau khi đã xử lý xong
    if (customer.programEnrollments && customer.programEnrollments.length > 0) {
      customer.programEnrollments = customer.programEnrollments.map(
        (enrollment) => {
          const program = enrollment.programId;
          if (!program) return enrollment;

          const stage = (program.stages || []).find((s) =>
            s._id.equals(enrollment.stageId),
          );
          const status = (program.statuses || []).find((s) =>
            s._id.equals(enrollment.statusId),
          );

          return {
            ...enrollment,
            stage: stage || null,
            status: status || null,
          };
        },
      );
    }

    // Thêm lại fieldDefinitions để frontend biết cần render những gì
    customer.fieldDefinitions = definitionsToDisplay;

    return JSON.parse(JSON.stringify(customer));
  } catch (error) {
    console.error(`Loi trong getCustomerDetails cho ID ${customerId}:`, error);
    return null;
  }
}

/**
 * Thêm hoặc cập nhật một giá trị thuộc tính động cho khách hàng.
 * [LƯU Ý] Hàm này sẽ cần được điều chỉnh lại sau nếu bạn muốn cho phép
 * người dùng nhập tay và lưu vào DB. Hiện tại nó chưa được sử dụng.
 */
export async function updateCustomerAttribute({
  customerId,
  definitionId,
  value,
  scope, // Cần biết scope để lưu đúng chỗ
  programId, // Cần nếu scope là PROGRAM
}) {
  try {
    // ... logic cập nhật DB sẽ được viết ở đây trong tương lai ...
    return { success: true };
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
