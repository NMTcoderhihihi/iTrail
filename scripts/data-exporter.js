// scripts/data-exporter.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT TRUY VẤN & XUẤT DỮ LIỆU TỔNG HỢP RA FILE ===
// =================================================================

// --- Định nghĩa Schema ---
// ** MODIFIED: Thêm trường `zaloActive` vào UserSchema để populate
const UserSchema = new Schema(
  {
    zaloActive: { type: mongoose.Types.ObjectId, ref: "ZaloAccount" },
  },
  { strict: false, collection: "users" },
);
const ZaloAccountSchema = new Schema(
  {},
  { strict: false, collection: "zaloaccounts" },
);
const StageSchema = new Schema({ name: String, level: Number });
const StatusSchema = new Schema({ name: String });
const CareProgramSchema = new Schema(
  {
    name: String,
    stages: [StageSchema],
    statuses: [StatusSchema],
  },
  { strict: false, collection: "careprograms" },
);
const ProgramEnrollmentSchema = new Schema(
  {
    programId: { type: mongoose.Types.ObjectId, ref: "CareProgram" },
    stageId: mongoose.Types.ObjectId,
    statusId: mongoose.Types.ObjectId,
  },
  { _id: false, strict: false },
);
const CustomerSchema = new Schema(
  {
    users: [{ type: mongoose.Types.ObjectId, ref: "User" }],
    programEnrollments: [ProgramEnrollmentSchema],
  },
  { strict: false, collection: "customers" },
);
const ActionHistorySchema = new Schema(
  {
    actorId: { type: mongoose.Types.ObjectId, ref: "User" },
    context: [{ key: String, value: [mongoose.Schema.Types.Mixed] }],
  },
  { strict: false, collection: "actionhistories" },
);
const ScheduledJobSchema = new Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
    zaloAccount: { type: mongoose.Types.ObjectId, ref: "ZaloAccount" },
  },
  { strict: false, collection: "scheduledjobs" },
);
const ArchivedJobSchema = new Schema(
  {
    createdBy: { type: mongoose.Types.ObjectId, ref: "User" },
    zaloAccount: { type: mongoose.Types.ObjectId, ref: "ZaloAccount" },
  },
  { strict: false, collection: "archivedjobs" },
);

// --- Khởi tạo Models ---
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const ZaloAccount =
  mongoose.models.ZaloAccount ||
  mongoose.model("ZaloAccount", ZaloAccountSchema);
const CareProgram =
  mongoose.models.CareProgram ||
  mongoose.model("CareProgram", CareProgramSchema);
const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
const ActionHistory =
  mongoose.models.ActionHistory ||
  mongoose.model("ActionHistory", ActionHistorySchema);
const ScheduledJob =
  mongoose.models.ScheduledJob ||
  mongoose.model("ScheduledJob", ScheduledJobSchema);
const ArchivedJob =
  mongoose.models.ArchivedJob ||
  mongoose.model("ArchivedJob", ArchivedJobSchema);

// === CÁC HÀM TRUY VẤN CHUYÊN SÂU ===

/**
 * 1. Lấy toàn bộ dữ liệu của một khách hàng
 */
async function getFullCustomerData(customerId) {
  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Customer ID không hợp lệ." };
  }

  const customer = await Customer.findById(customerId)
    .populate("users", "name email role")
    .populate({
      path: "programEnrollments.programId",
      model: "CareProgram",
      select: "name stages statuses",
    })
    .lean();

  if (!customer) {
    return { error: `Không tìm thấy khách hàng với ID: ${customerId}` };
  }

  const history = await ActionHistory.find({
    "context.value": new mongoose.Types.ObjectId(customerId),
  })
    .populate("actorId", "name email")
    .sort({ time: -1 })
    .limit(50)
    .lean();

  if (customer.programEnrollments && customer.programEnrollments.length > 0) {
    customer.programEnrollments.forEach((enrollment) => {
      if (enrollment.programId && enrollment.stageId) {
        enrollment.stage = enrollment.programId.stages.find((s) =>
          s._id.equals(enrollment.stageId),
        );
      }
      if (enrollment.programId && enrollment.statusId) {
        enrollment.status = enrollment.programId.statuses.find((s) =>
          s._id.equals(enrollment.statusId),
        );
      }
    });
  }

  return { customer, history };
}

/**
 * 2. Lấy toàn bộ dữ liệu của một User (nhân viên)
 */
async function getFullUserData(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return { error: "User ID không hợp lệ." };
  }

  const user = await User.findById(userId, "-password")
    .populate("zaloActive", "name phone avt")
    .lean();

  if (!user) {
    return { error: `Không tìm thấy user với ID: ${userId}` };
  }

  const assignedZaloAccounts = await ZaloAccount.find({ users: userId }).lean();
  const history = await ActionHistory.find({ actorId: userId })
    .sort({ time: -1 })
    .limit(50)
    .lean();

  return { user, assignedZaloAccounts, history };
}

/**
 * 3. Lấy toàn bộ dữ liệu của một Chiến dịch (Campaign)
 */
async function getFullCampaignData(campaignId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return { error: "Campaign ID không hợp lệ." };
  }

  let campaign = await ScheduledJob.findById(campaignId)
    .populate("createdBy", "name email")
    .populate("zaloAccount", "name phone")
    .lean();

  let sourceCollection = "scheduledjobs";

  if (!campaign) {
    campaign = await ArchivedJob.findById(campaignId)
      .populate("createdBy", "name email")
      .populate("zaloAccount", "name phone")
      .lean();
    sourceCollection = "archivedjobs";
  }

  if (!campaign) {
    return { error: `Không tìm thấy chiến dịch với ID: ${campaignId}` };
  }

  return { source: sourceCollection, campaign };
}

// === HÀM THỰC THI CHÍNH ===
async function main() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    // === CÁC ID CẦN KIỂM TRA ===
    const customerIdToTest = "68a3e3ebe986b54217cf1981";
    const userIdToTest = "6865fe3ccdec836f29fabe4f";
    const campaignIdToTest = "68819359e3f17326675e9fda";

    // ** MODIFIED: Xuất dữ liệu ra file thay vì console.log **
    const writeDataToFile = async (fileName, data) => {
      const outputPath = path.resolve(process.cwd(), fileName);
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`   -> ✅ Đã xuất dữ liệu ra file: ${outputPath}`);
    };

    console.log(
      `\n--- 1. ĐANG TRUY VẤN DỮ LIỆU KHÁCH HÀNG: ${customerIdToTest} ---`,
    );
    const customerData = await getFullCustomerData(customerIdToTest);
    await writeDataToFile("customer_export.json", customerData);

    console.log(`\n--- 2. ĐANG TRUY VẤN DỮ LIỆU USER: ${userIdToTest} ---`);
    const userData = await getFullUserData(userIdToTest);
    await writeDataToFile("user_export.json", userData);

    console.log(
      `\n--- 3. ĐANG TRUY VẤN DỮ LIỆU CHIẾN DỊCH: ${campaignIdToTest} ---`,
    );
    const campaignData = await getFullCampaignData(campaignIdToTest);
    await writeDataToFile("campaign_export.json", campaignData);
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi trong quá trình thực thi:", error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB.");
    }
  }
}

main();
