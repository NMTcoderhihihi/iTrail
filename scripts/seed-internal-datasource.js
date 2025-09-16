// [ADD] scripts/seed-internal-datasource.js
import { mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT TẠO DATASOURCE NỀN TẢNG CHO DỮ LIỆU NHẬP TAY ===
// =================================================================

const DataSourceSchema = new mongoose.Schema(
  {},
  { strict: false, collection: "datasources" },
);
const DataSource =
  mongoose.models.dataSource || mongoose.model("dataSource", DataSourceSchema);

// --- CẤU HÌNH ---
// Một ID cố định để dễ dàng tham chiếu trong code
const INTERNAL_DB_DATASOURCE_ID = new mongoose.Types.ObjectId(
  "69a3e3ebe986b54217cfdead",
);
const ADMIN_ID = new mongoose.Types.ObjectId("6865fe3ccdec836f29fabe4f"); // ID Admin mặc định

async function seedInternalDataSource() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    console.log("\n--- Bắt đầu tạo/cập nhật DataSource cho DB Nội bộ ---");

    const internalDataSource = {
      _id: INTERNAL_DB_DATASOURCE_ID,
      name: "DB_Internal_Attributes",
      description:
        "DataSource hệ thống để truy vấn dữ liệu do người dùng nhập tay từ customerAttributes và programData.",
      connectorType: "local_mongodb",
      inputParams: [
        {
          paramName: "customerId",
          paramType: "objectId",
          paramLabel: "ID Khách hàng",
        },
        {
          paramName: "definitionId",
          paramType: "objectId",
          paramLabel: "ID của Field Definition",
        },
        {
          paramName: "programId",
          paramType: "objectId",
          paramLabel: "ID Chương trình (nếu scope là PROGRAM)",
        },
      ],
      databasePipeline: [
        {
          $match: {
            _id: "$$customerId", // Sẽ được thay thế bằng ID khách hàng thật
          },
        },
        {
          $project: {
            // Gộp 2 mảng lại để xử lý chung
            allAttributes: {
              $concatArrays: ["$customerAttributes", "$programEnrollments"],
            },
          },
        },
        {
          $unwind: "$allAttributes",
        },
        {
          // Thay thế root bằng các document con đã unwind
          $replaceRoot: { newRoot: "$allAttributes" },
        },
        {
          // Lọc ra đúng attribute cần tìm
          $match: {
            $or: [
              // Trường hợp 1: attribute nằm ở cấp customer (customerAttributes)
              {
                definitionId: "$$definitionId",
              },
              // Trường hợp 2: attribute nằm trong chương trình (programData)
              {
                programId: "$$programId", // Chỉ khớp nếu programId được cung cấp
                "programData.definitionId": "$$definitionId",
              },
            ],
          },
        },
        {
          // Lấy ra giá trị cuối cùng
          $project: {
            value: {
              // Ưu tiên lấy từ programData trước nếu có
              $ifNull: ["$programData.value", "$value"],
            },
          },
        },
        { $unwind: "$value" },
        { $unwind: "$value" },
        { $replaceRoot: { newRoot: { result: "$value" } } },
      ],
      createdBy: ADMIN_ID,
    };

    await DataSource.updateOne(
      { _id: INTERNAL_DB_DATASOURCE_ID },
      { $set: internalDataSource },
      { upsert: true },
    );

    console.log(
      `   -> ✅ Hoàn tất! Đã tạo/cập nhật DataSource với ID: ${INTERNAL_DB_DATASOURCE_ID}`,
    );
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi trong quá trình thực thi:", error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB.");
    }
  }
}

seedInternalDataSource();
