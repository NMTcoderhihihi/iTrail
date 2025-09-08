// [MOD] scripts/seed-test-data.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT THÊM DỮ LIỆU MẪU (SEEDING) ===
// =================================================================

// --- Định nghĩa Schema cần thiết ---
const UserSchema = new Schema({}, { strict: false, collection: "users" });
const TagSchema = new Schema({}, { strict: false, collection: "tags" });
const CareProgramSchema = new Schema(
  {},
  { strict: false, collection: "careprograms" },
);
// [ADD] Thêm Customer Schema để cập nhật
const CustomerSchema = new Schema(
  {},
  { strict: false, collection: "customers" },
);

const User = mongoose.models.user || mongoose.model("user", UserSchema);
const Tag = mongoose.models.tag || mongoose.model("tag", TagSchema);
const CareProgram =
  mongoose.models.careProgram ||
  mongoose.model("careProgram", CareProgramSchema);
// [ADD] Thêm Customer Model
const Customer =
  mongoose.models.customer || mongoose.model("customer", CustomerSchema);

// --- Dữ liệu mẫu ---
const DEFAULT_ADMIN_ID = new mongoose.Types.ObjectId(
  "6865fe3ccdec836f29fabe4f",
);

const newCareProgram = {
  name: "Chăm sóc khách hàng VIP",
  description:
    "Chương trình chăm sóc đặc biệt dành cho các khách hàng tiềm năng cao.",
  isActive: true,
  users: [DEFAULT_ADMIN_ID],
  stages: [
    { _id: new mongoose.Types.ObjectId(), name: "Tiếp cận", level: 1 },
    { _id: new mongoose.Types.ObjectId(), name: "Tư vấn", level: 2 },
    { _id: new mongoose.Types.ObjectId(), name: "Chốt sale", level: 3 },
  ],
  statuses: [
    { _id: new mongoose.Types.ObjectId(), name: "VIP01 | Đã gửi báo giá" },
    { _id: new mongoose.Types.ObjectId(), name: "VIP02 | Đã hẹn gặp" },
    { _id: new mongoose.Types.ObjectId(), name: "VIP03 | Từ chối" },
  ],
};

const sampleTags = [
  {
    name: "Tiềm năng",
    detail: "Khách hàng có khả năng chốt cao",
    createdBy: DEFAULT_ADMIN_ID,
  },
  {
    name: "Cần gọi lại",
    detail: "Ưu tiên gọi lại trong ngày",
    createdBy: DEFAULT_ADMIN_ID,
  },
  {
    name: "VIP",
    detail: "Khách hàng thuộc nhóm ưu tiên đặc biệt",
    createdBy: DEFAULT_ADMIN_ID,
  },
  {
    name: "Nguồn Zalo",
    detail: "Khách hàng đến từ kênh Zalo",
    createdBy: DEFAULT_ADMIN_ID,
  },
];

// [ADD] SĐT của khách hàng cần gán
const customerPhoneToEnroll = "0329622705"; // <-- BẠN CÓ THỂ THAY SĐT NÀY

// --- Hàm thực thi chính ---
async function seedData() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    // 1. Thêm chương trình chăm sóc mới
    const programResult = await CareProgram.findOneAndUpdate(
      { name: newCareProgram.name },
      { $setOnInsert: newCareProgram },
      { upsert: true, new: true },
    );
    console.log(
      `   -> ✅ Đã thêm/cập nhật chương trình: "${newCareProgram.name}"`,
    );

    // 2. Thêm các tag mẫu
    for (const tag of sampleTags) {
      await Tag.updateOne(
        { name: tag.name },
        { $setOnInsert: tag },
        { upsert: true },
      );
    }
    console.log(`   -> ✅ Đã thêm/cập nhật ${sampleTags.length} tags mẫu.`);

    // [ADD] 3. Gán khách hàng vào chương trình VIP
    const customerToUpdate = await Customer.findOne({
      phone: customerPhoneToEnroll,
    });
    if (customerToUpdate) {
      // Kiểm tra xem khách hàng đã ở trong chương trình này chưa
      const isAlreadyEnrolled = customerToUpdate.programEnrollments.some(
        (e) => e.programId.toString() === programResult._id.toString(),
      );

      if (!isAlreadyEnrolled) {
        await Customer.updateOne(
          { _id: customerToUpdate._id },
          {
            $push: {
              programEnrollments: {
                programId: programResult._id,
                stageId: programResult.stages[0]._id, // Gán vào giai đoạn đầu tiên
                statusId: null,
                enrolledAt: new Date(),
              },
            },
          },
        );
        console.log(
          `   -> ✅ Đã gán khách hàng SĐT ${customerPhoneToEnroll} vào chương trình VIP.`,
        );
      } else {
        console.log(
          `   -> ℹ️ Khách hàng SĐT ${customerPhoneToEnroll} đã có trong chương trình VIP.`,
        );
      }
    } else {
      console.log(
        `   -> ⚠️ Không tìm thấy khách hàng có SĐT ${customerPhoneToEnroll} để gán.`,
      );
    }
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
seedData();
