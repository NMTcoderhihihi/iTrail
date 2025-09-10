// scripts/seed-care-programs.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT THÊM DỮ LIỆU CHƯƠG TRÌNH CHĂM SÓC MẪU (CHO DEMO) ===
// =================================================================

// --- Định nghĩa Schema ---
const CareProgramSchema = new Schema(
  {},
  { strict: false, collection: "careprograms" },
);
const CareProgram =
  mongoose.models.careProgram ||
  mongoose.model("careProgram", CareProgramSchema);

// --- Dữ liệu mẫu ---
const ADMIN_ID = new mongoose.Types.ObjectId("6865fe3ccdec836f29fabe4f");

const samplePrograms = [
  {
    name: "Chăm sóc khách hàng VIP 2025",
    description:
      "Chương trình chăm sóc đặc biệt dành cho các khách hàng tiềm năng cao.",
    isActive: true,
    users: [ADMIN_ID],
    stages: [
      { _id: new mongoose.Types.ObjectId(), name: "Tiếp cận", level: 1 },
      { _id: new mongoose.Types.ObjectId(), name: "Tư vấn", level: 2 },
      { _id: new mongoose.Types.ObjectId(), name: "Chốt sale", level: 3 },
      { _id: new mongoose.Types.ObjectId(), name: "Hậu mãi", level: 4 },
    ],
    statuses: [
      { _id: new mongoose.Types.ObjectId(), name: "VIP01 | Đã gửi báo giá" },
      { _id: new mongoose.Types.ObjectId(), name: "VIP02 | Đã hẹn gặp" },
      { _id: new mongoose.Types.ObjectId(), name: "VIP03 | Từ chối" },
    ],
  },
  {
    name: "Chăm sóc Khách hàng cũ",
    description:
      "Chương trình tái tương tác và chăm sóc các khách hàng đã từng sử dụng dịch vụ.",
    isActive: true,
    users: [ADMIN_ID],
    stages: [
      { _id: new mongoose.Types.ObjectId(), name: "Tái tiếp cận", level: 1 },
      { _id: new mongoose.Types.ObjectId(), name: "Tặng ưu đãi", level: 2 },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Ghi nhận phản hồi",
        level: 3,
      },
    ],
    statuses: [
      { _id: new mongoose.Types.ObjectId(), name: "KHC01 | Đã nhận ưu đãi" },
      { _id: new mongoose.Types.ObjectId(), name: "KHC02 | Không quan tâm" },
    ],
  },
];

// --- Hàm thực thi chính ---
async function seedCarePrograms() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    console.log("\n--- Bắt đầu thêm các chương trình chăm sóc mẫu ---");

    for (const program of samplePrograms) {
      // Dùng findOneAndUpdate với upsert: true để tránh tạo trùng lặp nếu chạy lại script
      await CareProgram.findOneAndUpdate(
        { name: program.name },
        { $setOnInsert: program },
        { upsert: true, new: true },
      );
      console.log(`   -> ✅ Đã thêm/cập nhật chương trình: "${program.name}"`);
    }

    console.log(
      `\n🎉 Hoàn tất! Đã thêm ${samplePrograms.length} chương trình chăm sóc mẫu vào hệ thống.`,
    );
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi trong quá trình thêm dữ liệu:", error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB.");
    }
  }
}

// Chạy script
seedCarePrograms();
