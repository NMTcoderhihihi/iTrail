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

const INTERNAL_DB_DATASOURCE_ID = "69a3e3ebe986b54217cfdead";

export async function getCustomerDetails(customerId) {
  try {
    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      throw new Error("ID khách hàng không hợp lệ.");
    }

    await connectDB();
    const currentUser = await getCurrentUser();

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

    // --- BƯỚC 2: LỌC RA CÁC FIELD DEFINITION CẦN HIỂN THỊ ---
    const allDefs = await FieldDefinition.find({}).lean();
    const definitionsToDisplay = new Map();

    for (const def of allDefs) {
      if (!def.displayRules || def.displayRules.length === 0) continue;

      for (const rule of def.displayRules) {
        const { conditions } = rule;
        const requiredTags = (conditions.requiredTags || []).map(String);
        const requiredPrograms = (conditions.requiredPrograms || []).map(
          String,
        );

        let tagsMatch =
          requiredTags.length === 0 ||
          (conditions.operator === "AND"
            ? requiredTags.every((rt) => customerTagIds.includes(rt))
            : requiredTags.some((rt) => customerTagIds.includes(rt)));

        let programsMatch =
          requiredPrograms.length === 0 ||
          (conditions.operator === "AND"
            ? requiredPrograms.every((rp) => customerProgramIds.includes(rp))
            : requiredPrograms.some((rp) => customerProgramIds.includes(rp)));

        const ruleMatched =
          conditions.operator === "AND"
            ? tagsMatch && programsMatch
            : tagsMatch || programsMatch;

        if (ruleMatched) {
          if (!definitionsToDisplay.has(def._id.toString())) {
            definitionsToDisplay.set(def._id.toString(), {
              ...def,
              matchedPlacements: new Set(),
              matchedRules: [],
            });
          }
          definitionsToDisplay.get(def._id.toString()).matchedRules.push(rule);
        }
      }
    }

    const finalDefs = Array.from(definitionsToDisplay.values());

    const externalDataSourceIds = [
      ...new Set(
        finalDefs
          .flatMap((def) =>
            (def.dataSourceIds || []).map((id) => id.toString()),
          )
          .filter((id) => id !== INTERNAL_DB_DATASOURCE_ID),
      ),
    ];
    const dataSourcePromises = externalDataSourceIds.map((id) =>
      executeDataSource({
        dataSourceId: id,
        params: { phone: customer.phone, citizenId: customer.citizenId },
      }),
    );
    const externalDataSourceResults = Object.fromEntries(
      await Promise.all(
        externalDataSourceIds.map(async (id, index) => [
          id,
          await dataSourcePromises[index],
        ]),
      ),
    );

    customer.customerAttributes = [];
    customer.programEnrollments.forEach((e) => {
      e.programData = [];
    });

    for (const def of finalDefs) {
      let finalValue = undefined;
      for (const dsId of def.dataSourceIds || []) {
        let result;
        if (dsId.toString() === INTERNAL_DB_DATASOURCE_ID) {
          result = await executeDataSource({
            dataSourceId: dsId.toString(),
            params: { customerId: customer._id, definitionId: def._id },
          });
        } else {
          result = externalDataSourceResults[dsId.toString()];
        }

        if (Array.isArray(result) && result.length > 0) result = result[0];

        // [MOD] Sửa lại logic trích xuất giá trị
        const valueFromDs = result?.result ?? result?.[def.fieldName];

        if (valueFromDs !== undefined) {
          finalValue = valueFromDs;
          break;
        }
      }

      if (finalValue !== undefined) {
        const attribute = {
          definitionId: def._id,
          value: Array.isArray(finalValue) ? finalValue : [finalValue],
          createdBy: currentUser.id,
          createdAt: new Date(),
        };

        // [FIX] Logic gán giá trị đã được sửa lại hoàn toàn
        for (const rule of def.matchedRules) {
          if (rule.placement === "COMMON") {
            if (
              !customer.customerAttributes.some((a) =>
                a.definitionId.equals(def._id),
              )
            ) {
              customer.customerAttributes.push(attribute);
            }
          } else if (rule.placement === "PROGRAM") {
            const programsInRule = (rule.conditions.requiredPrograms || []).map(
              String,
            );
            customer.programEnrollments.forEach((enrollment) => {
              const enrollmentProgramId = enrollment.programId?._id.toString();
              if (
                programsInRule.includes(enrollmentProgramId) &&
                !enrollment.programData.some((a) =>
                  a.definitionId.equals(def._id),
                )
              ) {
                enrollment.programData.push(attribute);
              }
            });
          }
        }
      }
    }

    // --- BƯỚC 4: HOÀN THIỆN ---
    // (Gắn thông tin stage/status vào enrollment)
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

    customer.fieldDefinitions = finalDefs;
    return JSON.parse(JSON.stringify(customer));
  } catch (error) {
    console.error(`Loi trong getCustomerDetails cho ID ${customerId}:`, error);
    return null;
  }
}

// [ADD] Server Action để tạo và gán trường dữ liệu thủ công
export async function createAndAssignManualField({
  customerId,
  fieldLabel,
  fieldValue,
  programId = null,
}) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    // 1. Kiểm tra Tag đã tồn tại chưa
    const existingTag = await Tag.findOne({ name: fieldLabel }).lean();
    if (existingTag) {
      throw new Error(
        `Tên trường "${fieldLabel}" đã tồn tại dưới dạng Tag. Vui lòng chọn tên khác.`,
      );
    }

    // 2. Chuẩn hóa fieldName
    const fieldName = fieldLabel
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const existingFieldDef = await FieldDefinition.findOne({
      fieldName,
    }).lean();
    if (existingFieldDef) {
      throw new Error(
        `Tên trường "${fieldLabel}" sau khi chuẩn hóa (${fieldName}) đã tồn tại. Vui lòng chọn tên khác.`,
      );
    }

    // 3. Tạo Tag
    const newTag = await Tag.create({
      name: fieldLabel,
      detail: `Tag hệ thống cho trường dữ liệu thủ công '${fieldLabel}'`,
      createdBy: currentUser._id,
    });

    const newFieldDefData = {
      fieldName,
      fieldLabel,
      fieldType: "string",
      dataSourceIds: [new Types.ObjectId(INTERNAL_DB_DATASOURCE_ID)],
      createdBy: currentUser._id,
      displayRules: [
        {
          placement: programId ? "PROGRAM" : "COMMON",
          conditions: {
            operator: "AND",
            requiredTags: [newTag._id],
            requiredPrograms: programId ? [new Types.ObjectId(programId)] : [],
          },
        },
      ],
    };
    const newFieldDef = await FieldDefinition.create(newFieldDefData); // 5. Cập nhật Customer

    const newAttribute = {
      definitionId: newFieldDef._id,
      value: [fieldValue],
      createdBy: currentUser._id,
      createdAt: new Date(),
    };

    let updateQuery;
    let arrayFilters = [];

    if (programId) {
      updateQuery = {
        $push: {
          "programEnrollments.$[elem].programData": newAttribute,
          tags: newTag._id,
        },
      };
      arrayFilters = [{ "elem.programId": new Types.ObjectId(programId) }];
    } else {
      updateQuery = {
        $push: { customerAttributes: newAttribute, tags: newTag._id },
      };
    }

    await Customer.updateOne({ _id: customerId }, updateQuery, {
      arrayFilters,
    });

    revalidateAndBroadcast(`customer_details_${customerId}`);
    revalidateAndBroadcast("field_definitions");
    revalidateAndBroadcast("tags");

    return { success: true, message: "Thêm trường dữ liệu thành công." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ... (Các hàm updateCustomerTags, addTagsToCustomers, v.v... giữ nguyên không đổi)
/**
 * Thêm hoặc cập nhật một giá trị thuộc tính động cho khách hàng.
 * [LƯU Ý] Hàm này sẽ cần được điều chỉnh lại sau nếu bạn muốn cho phép
 * người dùng nhập tay và lưu vào DB. Hiện tại nó chưa được sử dụng.
 */
export async function updateCustomerAttribute({
  customerId,
  definitionId,
  value,
  scope,
  programId,
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

    revalidateAndBroadcast("customer_details");
    revalidateAndBroadcast("customer_list");
    return { success: true, data: JSON.parse(JSON.stringify(updatedCustomer)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function addTagsToCustomers({ customerIds, tagIds }) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    // Sử dụng $addToSet để thêm các tag vào mảng mà không tạo ra bản sao
    const result = await Customer.updateMany(
      { _id: { $in: customerIds } },
      { $addToSet: { tags: { $each: tagIds } } },
    );

    revalidateAndBroadcast("customer_details");
    revalidateAndBroadcast("customer_list");
    revalidateAndBroadcast("tags");
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function enrollCustomersInProgram({
  customerIds,
  programId,
  stageId,
  statusId,
}) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    if (!programId || !customerIds || customerIds.length === 0) {
      throw new Error("Thiếu thông tin chương trình hoặc khách hàng.");
    }

    const newEnrollment = {
      programId,
      stageId: stageId || null,
      statusId: statusId || null,
      enrolledAt: new Date(),
      dataStatus: "assigned",
    };

    // Chỉ thêm enrollment cho những khách hàng chưa tham gia chương trình này
    const result = await Customer.updateMany(
      {
        _id: { $in: customerIds },
        "programEnrollments.programId": { $ne: programId },
      },
      {
        $push: { programEnrollments: newEnrollment },
      },
    );

    revalidateAndBroadcast("customer_details");
    revalidateAndBroadcast("customer_list");
    return { success: true, modifiedCount: result.modifiedCount };
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
      // [MOD] Sử dụng currentUser._id thay vì currentUser.id để nhất quán
      user: currentUser._id,
      detail: detail,
      time: new Date(),
    };

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { $push: { comments: { $each: [newComment], $position: 0 } } },
      { new: true },
    ).populate({ path: "comments.user", model: User, select: "name" });

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
