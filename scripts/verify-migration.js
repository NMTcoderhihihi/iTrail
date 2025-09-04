// scripts/verify-migration.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT KIỂM TRA ĐỘC LẬP SAU KHI DI TRÚ ===
// =================================================================

async function verifyMigration() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    console.log("\n--- ⭐ Bắt đầu kiểm tra dữ liệu sau khi di trú ---");

    // Định nghĩa lại TẤT CẢ các schema cần thiết cho việc populate.
    // 1. User Schema (cần cho populate('users'))
    const UserSchema = new Schema({}, { strict: false, collection: "users" });

    // 2. CareProgram Schema (cần cho populate('programEnrollments.programId'))
    const StageSchema = new Schema({
      _id: mongoose.Types.ObjectId,
      name: String,
      level: Number,
      description: String,
    });
    const StatusSchema = new Schema({
      _id: mongoose.Types.ObjectId,
      name: String,
      description: String,
    });
    const CareProgramSchema = new Schema(
      {
        _id: {
          type: mongoose.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        name: String,
        description: String,
        isActive: Boolean,
        users: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        stages: [StageSchema],
        statuses: [StatusSchema],
      },
      { collection: "careprograms" },
    );

    // 3. Customer Schema (schema chính để truy vấn)
    const AttributeValueSchema = new Schema({}, { strict: false, _id: false });
    const ProgramEnrollmentSchema = new Schema(
      {
        programId: {
          type: mongoose.Types.ObjectId,
          ref: "careProgram",
          required: true,
        },
      },
      { strict: false, _id: false },
    );

    const CustomerVerifySchema = new Schema(
      {
        name: { type: String, trim: true },
        phone: { type: String, required: true, unique: true, trim: true },
        citizenId: { type: String, trim: true },
        tags: [{ type: mongoose.Types.ObjectId, ref: "tag" }],
        users: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        uid: [new Schema({}, { strict: false, _id: false })],
        comments: [new Schema({}, { strict: false })],
        action: [new Schema({}, { strict: false, _id: false })],
        customerAttributes: [AttributeValueSchema],
        programEnrollments: [ProgramEnrollmentSchema],
      },
      { timestamps: true, collection: "customers" },
    );

    // Đăng ký các model
    if (!mongoose.models.user) mongoose.model("user", UserSchema);
    if (!mongoose.models.careProgram)
      mongoose.model("careProgram", CareProgramSchema);
    const Customer =
      mongoose.models.Customer ||
      mongoose.model("Customer", CustomerVerifySchema);

    // !!! THAY THẾ ID KHÁCH HÀNG Ở ĐÂY
    const specificCustomerId = "68a3e3ebe986b54217cf1981";

    const specificCustomer = await Customer.findById(specificCustomerId)
      .populate([
        {
          path: "programEnrollments.programId",
          select: "name statuses stages",
        },
        { path: "users", select: "name" },
      ])
      .lean();

    if (specificCustomer) {
      console.log("   -> ✅ Đã tìm thấy khách hàng cụ thể:");
      console.log(
        JSON.stringify(
          {
            _id: specificCustomer._id,
            name: specificCustomer.name,
            phone: specificCustomer.phone,
            users: (specificCustomer.users || []).map((u) => u.name),
            program: specificCustomer.programEnrollments[0]?.programId?.name,
          },
          null,
          2,
        ),
      );

      const enrollment = specificCustomer.programEnrollments[0];
      if (enrollment && enrollment.programId) {
        const status = (enrollment.programId.statuses || []).find((s) =>
          s._id.equals(enrollment.statusId),
        );
        const stage = (enrollment.programId.stages || []).find((s) =>
          s._id.equals(enrollment.stageId),
        );
        console.log(
          `   -> Trạng thái di trú: ${
            status ? `OK (${status.name})` : "⚠️ LỖI hoặc không có"
          }`,
        );
        console.log(
          `   -> Giai đoạn di trú: ${
            stage ? `OK (Cấp ${stage.level})` : "⚠️ LỖI hoặc không có"
          }`,
        );
      } else {
        console.log(
          "   -> ℹ️ Khách hàng này không có thông tin ghi danh hợp lệ để kiểm tra.",
        );
      }
    } else {
      console.log(
        `   -> ⚠️ Không tìm thấy khách hàng với ID: ${specificCustomerId}`,
      );
    }
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi:", error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB. Quá trình kết thúc.");
    }
  }
}

verifyMigration();
