// ++ ADDED: Toàn bộ file này là mới và chứa logic "Data Aggregation Engine"
"use server";

import connectDB from "@/config/connectDB";
import Customer from "@/models/customer";
import FieldDefinition from "@/models/fieldDefinition";
import { executeDataSource } from "../dataSource/dataSource.service";
import { Types } from "mongoose";

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
    const customer = await Customer.findById(customerId).lean();
    if (!customer) {
      return null;
    }

    const enrollment = customer.programEnrollments?.[0];
    if (!enrollment || !enrollment.programId) {
      return JSON.parse(JSON.stringify(customer)); // Trả về dữ liệu gốc nếu không tham gia chương trình nào
    }

    const requiredFields = await FieldDefinition.find({
      programIds: enrollment.programId,
      dataSourceIds: { $exists: true, $ne: [] },
    }).lean();

    if (requiredFields.length === 0) {
      return JSON.parse(JSON.stringify(customer)); // Trả về dữ liệu gốc nếu không có trường động nào
    }

    // --- BƯỚC 2: LẬP KẾ HOẠCH TRUY VẤN (TỐI ƯU HÓA) ---
    // Gom nhóm tất cả các DataSource cần gọi để tránh gọi trùng lặp
    const uniqueDataSourceIds = new Set();
    requiredFields.forEach((field) => {
      field.dataSourceIds.forEach((dsId) =>
        uniqueDataSourceIds.add(dsId.toString()),
      );
    });

    const queryPlan = Array.from(uniqueDataSourceIds);

    // --- BƯỚC 3: THỰC THI KẾ HOẠCH TRUY VẤN SONG SONG ---
    const dataSourcePromises = queryPlan.map((dsId) =>
      executeDataSource({
        dataSourceId: dsId,
        params: {
          phone: customer.phone,
          citizenId: customer.citizenId,
          customerId: customer._id.toString(),
        },
      }),
    );

    const results = await Promise.all(dataSourcePromises);

    // Map kết quả lại với ID của DataSource để tra cứu dễ dàng
    const resultsByDataSourceId = queryPlan.reduce((acc, dsId, index) => {
      const result = results[index];
      if (result && !result.error) {
        // Giả định kết quả luôn là một mảng chứa một object
        acc[dsId] = Array.isArray(result) ? result[0] : result;
      } else {
        acc[dsId] = null; // Đánh dấu là lỗi hoặc không có dữ liệu
      }
      return acc;
    }, {});

    // --- BƯỚC 4: TỔNG HỢP DỮ LIỆU VỚI LOGIC ƯU TIÊN & FALLBACK ---
    let enrichedData = {};
    for (const field of requiredFields) {
      // Chỉ xử lý nếu trường này chưa có trong kết quả
      if (enrichedData[field.fieldName] === undefined) {
        // Lặp qua các nguồn dữ liệu theo thứ tự ưu tiên
        for (const dsId of field.dataSourceIds) {
          const sourceResult = resultsByDataSourceId[dsId.toString()];
          // Nếu nguồn này có kết quả VÀ có chứa trường dữ liệu ta cần
          if (sourceResult && sourceResult[field.fieldName] !== undefined) {
            enrichedData[field.fieldName] = sourceResult[field.fieldName];
            break; // Dừng lại ngay khi tìm thấy dữ liệu từ nguồn ưu tiên nhất
          }
        }
      }
    }

    // --- BƯỚC 5: GỘP DỮ LIỆU & TRẢ VỀ ---
    const fullDetails = {
      ...customer,
      ...enrichedData,
    };

    return JSON.parse(JSON.stringify(fullDetails));
  } catch (error) {
    console.error(`Loi trong getCustomerDetails cho ID ${customerId}:`, error);
    return null;
  }
}
