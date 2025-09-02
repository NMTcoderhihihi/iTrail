// scripts/migrate-db.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === CONFIGURATION (CẤU HÌNH) ===
// =================================================================
const DEFAULT_CARE_PROGRAM_ID = new mongoose.Types.ObjectId();
// !!! QUAN TRỌNG: Hãy thay thế ID này bằng một ID Admin thực tế trong DB của bạn
const DEFAULT_ADMIN_ID = new mongoose.Types.ObjectId(
  "6865fe3ccdec836f29fabe4f",
);
const LHU_API_DATASOURCE_ID = new mongoose.Types.ObjectId();

// =================================================================
// === OLD SCHEMA DEFINITIONS (ĐỊNH NGHĨA SCHEMA CŨ ĐỂ ĐỌC) ===
// =================================================================
const CustomerOldSchema = new Schema(
  {},
  { strict: false, collection: "customers" },
);
const StatusOldSchema = new Schema({}, { strict: false, collection: "status" });
const HistoryOldSchema = new Schema(
  {},
  { strict: false, collection: "actionhistories" },
);
const LabelOldSchema = new Schema({}, { strict: false, collection: "labels" });

const Customer_Old =
  mongoose.models.Customer_Old ||
  mongoose.model("Customer_Old", CustomerOldSchema);
const Status_Old =
  mongoose.models.Status_Old || mongoose.model("Status_Old", StatusOldSchema);
const History_Old =
  mongoose.models.History_Old ||
  mongoose.model("History_Old", HistoryOldSchema);
const Label_Old =
  mongoose.models.Label_Old || mongoose.model("Label_Old", LabelOldSchema);

// =================================================================
// === NEW SCHEMA DEFINITIONS (ĐỊNH NGHĨA SCHEMA MỚI ĐỂ GHI) ===
// =================================================================
const User =
  mongoose.models.user ||
  mongoose.model(
    "user",
    new Schema({}, { strict: false, collection: "users" }),
  );
const Tag =
  mongoose.models.tag ||
  mongoose.model(
    "tag",
    new Schema(
      { name: String, detail: String, createdBy: mongoose.Types.ObjectId },
      { collection: "tags" },
    ),
  );
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

const FieldDefinitionSchema = new Schema(
  {},
  { strict: false, collection: "fielddefinitions" },
);
const DataSourceSchema = new Schema(
  {},
  { strict: false, collection: "datasources" },
);

const AttributeValueSchema = new Schema(
  {
    definitionId: {
      type: mongoose.Types.ObjectId,
      ref: "fieldDefinition",
      required: true,
    },
    value: { type: [mongoose.Schema.Types.Mixed], required: true },
    createdBy: { type: mongoose.Types.ObjectId, ref: "user", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProgramEnrollmentSchema = new Schema(
  {
    programId: {
      type: mongoose.Types.ObjectId,
      ref: "careProgram",
      required: true,
    },
    stageId: { type: mongoose.Types.ObjectId },
    statusId: { type: mongoose.Types.ObjectId },
    dataStatus: { type: String },
    programData: [AttributeValueSchema],
    enrolledAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CustomerSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    citizenId: { type: String, trim: true },
    tags: [{ type: mongoose.Types.ObjectId, ref: "tag" }],
    users: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    uid: [
      new Schema(
        {
          zaloId: { type: mongoose.Types.ObjectId, ref: "zaloaccount" },
          uid: String,
        },
        { _id: false },
      ),
    ],
    comments: [
      new Schema({
        user: { type: mongoose.Types.ObjectId, ref: "user" },
        detail: String,
        time: Date,
      }),
    ],
    action: [
      new Schema(
        { job: { type: mongoose.Types.ObjectId, ref: "scheduledjob" } },
        { _id: false, strict: false },
      ),
    ],
    customerAttributes: [AttributeValueSchema],
    programEnrollments: [ProgramEnrollmentSchema],
  },
  { timestamps: true, collection: "customers_new" },
);

const KeyDefinitionSchema = new Schema(
  { name: String, type: String },
  { _id: false },
);
const ActionTypeDefinitionSchema = new Schema(
  {
    actionType: String,
    description: String,
    requiredContextKeys: [KeyDefinitionSchema],
    requiredDetailKeys: [KeyDefinitionSchema],
  },
  { collection: "actiontypedefinitions" },
);

const ValueEntrySchema = new Schema(
  { key: String, value: [mongoose.Schema.Types.Mixed], type: String },
  { _id: false },
);
const ActionHistorySchema = new Schema(
  {
    actionTypeId: mongoose.Types.ObjectId,
    actorId: { type: mongoose.Types.ObjectId, ref: "user" },
    context: [ValueEntrySchema],
    detail: [ValueEntrySchema],
    time: Date,
  },
  { collection: "actionhistories_new" },
);

const MessageTemplateSchema = new Schema(
  {},
  { strict: false, collection: "messagetemplates" },
);

const CareProgram =
  mongoose.models.careProgram ||
  mongoose.model("CareProgram", CareProgramSchema);
const FieldDefinition =
  mongoose.models.fieldDefinition ||
  mongoose.model("FieldDefinition", FieldDefinitionSchema);
const DataSource =
  mongoose.models.dataSource || mongoose.model("DataSource", DataSourceSchema);
const Customer =
  mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
const ActionTypeDefinition =
  mongoose.models.actionTypeDefinition ||
  mongoose.model("ActionTypeDefinition", ActionTypeDefinitionSchema);
const ActionHistory =
  mongoose.models.actionHistory ||
  mongoose.model("ActionHistory", ActionHistorySchema);
const MessageTemplate =
  mongoose.models.messageTemplate ||
  mongoose.model("MessageTemplate", MessageTemplateSchema);

// =================================================================
// === MIGRATION LOGIC (LOGIC DI TRÚ) ===
// =================================================================

async function migrateInitialSetup() {
  console.log("\n--- Bước 1: Thiết lập dữ liệu nền tảng ---");
  // 1. Tạo chương trình chăm sóc mặc định
  await CareProgram.updateOne(
    { _id: DEFAULT_CARE_PROGRAM_ID },
    {
      $setOnInsert: {
        name: "Chương trình Tuyển sinh Mặc định",
        description: "Chương trình chăm sóc được di trú từ hệ thống cũ.",
        isActive: true,
        stages: [
          { _id: new mongoose.Types.ObjectId(), name: "Chưa có", level: 0 },
          { _id: new mongoose.Types.ObjectId(), name: "Chăm sóc", level: 1 },
          { _id: new mongoose.Types.ObjectId(), name: "OTP", level: 2 },
          { _id: new mongoose.Types.ObjectId(), name: "Nhập học", level: 3 },
        ],
      },
    },
    { upsert: true },
  );
  console.log("   -> ✅ Đã tạo/đảm bảo CareProgram mặc định tồn tại.");

  // 2. Tạo Data Source cho API Tuyển sinh
  await DataSource.updateOne(
    { _id: LHU_API_DATASOURCE_ID },
    {
      $setOnInsert: {
        name: "API Tuyển sinh LHU",
        connectorType: "api",
        configParams: {
          params: [
            {
              key: "url",
              value: "https://tapi.lhu.edu.vn/TS/AUTH/XetTuyen_TraCuu",
            },
          ],
        },
        createdBy: DEFAULT_ADMIN_ID,
      },
    },
    { upsert: true },
  );
  console.log("   -> ✅ Đã tạo/đảm bảo DataSource API Tuyển sinh tồn tại.");

  // 3. Định nghĩa các trường dữ liệu động cho chương trình Tuyển sinh
  const fieldDefinitions = [
    {
      fieldName: "DienThoai",
      fieldLabel: "Di động (API)",
      fieldType: "string",
    },
    { fieldName: "MaDangKy", fieldLabel: "Mã Đăng ký", fieldType: "string" },
    { fieldName: "CMND", fieldLabel: "CMND/CCCD (API)", fieldType: "string" },
    { fieldName: "NgayDK", fieldLabel: "Ngày Đăng ký", fieldType: "date" },
    { fieldName: "TruongTHPT", fieldLabel: "Trường THPT", fieldType: "string" },
    {
      fieldName: "TenNganh",
      fieldLabel: "Ngành Xét tuyển",
      fieldType: "string",
    },
    { fieldName: "TongDiem", fieldLabel: "Tổng Điểm", fieldType: "number" },
    {
      fieldName: "TenPhuongThuc",
      fieldLabel: "Phương thức XT",
      fieldType: "string",
    },
    {
      fieldName: "TinhTrang",
      fieldLabel: "Tình trạng XT",
      fieldType: "string",
    },
  ];
  for (const field of fieldDefinitions) {
    await FieldDefinition.updateOne(
      { fieldName: field.fieldName },
      {
        $set: {
          ...field,
          isCommonAttribute: false,
          programIds: [DEFAULT_CARE_PROGRAM_ID],
          dataSourceIds: [LHU_API_DATASOURCE_ID],
          createdBy: DEFAULT_ADMIN_ID,
        },
      },
      { upsert: true },
    );
  }
  console.log(
    `   -> ✅ Đã tạo/cập nhật ${fieldDefinitions.length} FieldDefinitions cho chương trình tuyển sinh.`,
  );

  // 4. Định nghĩa đầy đủ các loại hành động
  const actionTypes = [
    // =================================================================
    // === NHÓM HÀNH ĐỘNG: TƯƠNG TÁC VỚI KHÁCH HÀNG (CUSTOMER) ===
    // =================================================================
    {
      actionType: "update_customer_core_info",
      description:
        "Cập nhật các trường thông tin cố định của khách hàng (name, phone, citizenId).",
      contextKeys: [{ name: "customerId", type: "objectId" }],
      detailKeys: [
        { name: "fieldName", type: "string" },
        { name: "oldValue", type: "string" },
        { name: "newValue", type: "string" },
      ],
    },
    {
      actionType: "update_customer_common_attribute",
      description:
        "Cập nhật một thuộc tính chung trong mảng customerAttributes.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "fieldDefinitionId", type: "objectId" },
      ],
      detailKeys: [
        { name: "oldValue", type: "array_string" },
        { name: "newValue", type: "array_string" },
      ],
    },
    {
      actionType: "assign_customer_tag",
      description: "Gán một tag cho khách hàng.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "tagId", type: "objectId" },
      ],
    },
    {
      actionType: "unassign_customer_tag",
      description: "Gỡ một tag khỏi khách hàng.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "tagId", type: "objectId" },
      ],
    },
    {
      actionType: "assign_customer_user",
      description: "Gán một nhân viên chăm sóc cho khách hàng.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "assignedUserId", type: "objectId" },
      ],
    },
    {
      actionType: "unassign_customer_user",
      description: "Gỡ một nhân viên chăm sóc khỏi khách hàng.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "assignedUserId", type: "objectId" },
      ],
    },
    {
      actionType: "add_customer_comment",
      description: "Thêm một bình luận mới cho khách hàng.",
      contextKeys: [{ name: "customerId", type: "objectId" }],
      detailKeys: [{ name: "commentId", type: "objectId" }],
    },

    // =================================================================
    // === NHÓM HÀNH ĐỘNG: TƯƠNG TÁC VỚI CHƯƠNG TRÌNH (PROGRAM) ===
    // =================================================================
    {
      actionType: "enroll_customer_in_program",
      description: "Ghi danh một khách hàng vào một chương trình chăm sóc.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "programId", type: "objectId" },
      ],
      detailKeys: [
        { name: "stageId", type: "objectId" },
        { name: "statusId", type: "objectId" },
      ],
    },
    {
      actionType: "update_customer_enrollment",
      description:
        "Cập nhật thông tin ghi danh của KH (stage, status, dataStatus).",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "programId", type: "objectId" },
      ],
      detailKeys: [
        { name: "fieldName", type: "string" },
        { name: "oldValue", type: "string" }, // Có thể là ObjectId hoặc string
        { name: "newValue", type: "string" },
      ],
    },
    {
      actionType: "update_customer_program_data",
      description: "Cập nhật dữ liệu động của KH trong một chương trình.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "programId", type: "objectId" },
        { name: "fieldDefinitionId", type: "objectId" },
      ],
      detailKeys: [
        { name: "oldValue", type: "array_string" },
        { name: "newValue", type: "array_string" },
      ],
    },

    // =================================================================
    // === NHÓM HÀNH ĐỘNG: LỊCH TRÌNH & TÁC VỤ (SCHEDULE) ===
    // =================================================================
    {
      actionType: "create_scheduled_task",
      description: "Tạo một tác vụ (gửi tin, kết bạn...) trong một lịch trình.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [
        { name: "scheduleId", type: "objectId" },
        { name: "scheduledFor", type: "date" }, // Thời điểm task sẽ chạy
      ],
    },
    {
      actionType: "delete_scheduled_task",
      description: "Xóa một tác vụ khỏi một lịch trình.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [{ name: "scheduleId", type: "objectId" }],
    },
    {
      actionType: "execute_scheduled_task",
      description: "CRON Job thực thi một tác vụ đã được lên lịch.",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "finalMessage", type: "string" }, // Lời chào khi kết bạn, hoặc tin nhắn đã được biến thể
        { name: "scriptResult", type: "string" }, // Kết quả JSON thô từ script
      ],
    },
    {
      actionType: "auto_cancel_scheduled_task",
      description:
        "Hệ thống tự động hủy một tác vụ do lỗi (giới hạn, token...).",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "reasonRoot", type: "string" }, // Kết quả JSON thô của hành động gây ra lỗi
        { name: "description", type: "string" }, // Diễn giải lý do
      ],
    },

    // =================================================================
    // === NHÓM HÀNH ĐỘNG: QUẢN LÝ CẤU HÌNH HỆ THỐNG (CRUD) ===
    // =================================================================
    {
      actionType: "create_document",
      description: "Tạo một bản ghi mới trong một collection.",
      contextKeys: [{ name: "collectionName", type: "string" }],
      detailKeys: [
        { name: "documentId", type: "objectId" },
        { name: "documentName", type: "string" },
      ],
    },
    {
      actionType: "update_document",
      description: "Cập nhật một bản ghi trong một collection.",
      contextKeys: [
        { name: "collectionName", type: "string" },
        { name: "documentId", type: "objectId" },
      ],
      detailKeys: [
        { name: "fieldName", type: "string" },
        { name: "oldValue", type: "string" }, // Dùng string để lưu Bất cứ kiểu dữ liệu nào
        { name: "newValue", type: "string" },
      ],
    },
    {
      actionType: "delete_document",
      description: "Xóa một bản ghi khỏi một collection.",
      contextKeys: [{ name: "collectionName", type: "string" }],
      detailKeys: [
        { name: "documentId", type: "objectId" },
        { name: "documentName", type: "string" },
      ],
    },
  ];
  for (const at of actionTypes) {
    await ActionTypeDefinition.updateOne(
      { actionType: at.actionType },
      {
        $set: {
          description: at.description,
          requiredContextKeys: at.contextKeys || [],
          requiredDetailKeys: at.detailKeys || [],
        },
      },
      { upsert: true },
    );
  }
  console.log("   -> ✅ Đã tạo/cập nhật đầy đủ ActionTypeDefinitions.");
}

async function migrateStatusesAndTemplates() {
  console.log("\n--- Bước 2: Di trú Trạng thái & Mẫu tin ---");
  const oldStatuses = await Status_Old.find().lean();
  if (oldStatuses.length > 0) {
    const newStatuses = oldStatuses.map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description || "",
    }));
    await CareProgram.findByIdAndUpdate(DEFAULT_CARE_PROGRAM_ID, {
      $addToSet: { statuses: { $each: newStatuses } },
    });
    console.log(`   -> ✅ Đã di trú ${newStatuses.length} trạng thái.`);
  } else {
    console.log("   -> ℹ️ Không có trạng thái cũ để di trú.");
  }

  const db = mongoose.connection.db;
  const labelsExist =
    (await db.listCollections({ name: "labels" }).toArray()).length > 0;

  if (labelsExist) {
    console.log(
      "   -> ℹ️ Tìm thấy collection 'labels'. Bắt đầu di trú dữ liệu...",
    );
    const oldLabels = await Label_Old.find().lean();
    if (oldLabels.length > 0) {
      await MessageTemplate.deleteMany({}); // Xóa sạch collection mới trước khi chèn
      await MessageTemplate.insertMany(oldLabels);
      console.log(
        `   -> ✅ Đã sao chép ${oldLabels.length} bản ghi từ 'labels' sang 'messagetemplates'.`,
      );
      await db.collection("labels").drop();
      console.log("   -> ✅ Đã xóa collection 'labels' cũ.");
    } else {
      console.log("   -> ℹ️ Collection 'labels' rỗng, không có gì để di trú.");
    }
  } else {
    console.log("   -> ℹ️ Collection 'labels' không tồn tại, bỏ qua bước này.");
  }
}

async function migrateCustomers() {
  console.log("\n--- Bước 3: Di trú Khách hàng (Customers) ---");
  const oldCustomers = await Customer_Old.find().lean();
  if (oldCustomers.length === 0) {
    console.log("   -> ℹ️ Không có khách hàng cũ.");
    return;
  }

  const defaultProgram = await CareProgram.findById(
    DEFAULT_CARE_PROGRAM_ID,
  ).lean();
  const newCustomers = oldCustomers.map((oldC) => {
    const oldStatusId = oldC.status;
    const newStatus = defaultProgram.statuses.find((s) =>
      s._id.equals(oldStatusId),
    );
    const oldStageLevel = oldC.stageLevel || 0;
    const newStage = defaultProgram.stages.find(
      (s) => s.level === oldStageLevel,
    );

    const newComments = (oldC.comments || []).map((c) => ({
      user: c.user,
      detail: c.detail,
      time: c.time,
    }));

    return {
      _id: oldC._id,
      name: oldC.name,
      phone: oldC.phone,
      citizenId: oldC.CMND || null,
      tags: [],
      users: oldC.users || [],
      uid: oldC.uid || [],
      comments: newComments,
      action: oldC.action || [],
      customerAttributes: [],
      programEnrollments: [
        {
          programId: DEFAULT_CARE_PROGRAM_ID,
          stageId: newStage?._id || null,
          statusId: newStatus?._id || null,
          dataStatus: "migrated",
          programData: [],
          enrolledAt: oldC.createdAt || new Date(),
        },
      ],
      createdAt: oldC.createdAt,
      updatedAt: oldC.updatedAt,
    };
  });

  await Customer.deleteMany({});
  await Customer.insertMany(newCustomers);
  console.log(`   -> ✅ Đã di trú ${newCustomers.length} khách hàng.`);
}

async function finalizeMigration() {
  console.log("\n--- Bước 4: Hoàn tất Di trú ---");
  const db = mongoose.connection.db;
  const renameAndDrop = async (oldName, newName) => {
    try {
      const collections = await db.listCollections({ name: oldName }).toArray();
      if (collections.length > 0) {
        await db
          .collection(oldName)
          .rename(`${oldName}_old`, { dropTarget: true });
        console.log(`   -> ✅ Đã đổi tên ${oldName} -> ${oldName}_old`);
      } else {
        console.log(
          `   -> ℹ️ Collection ${oldName} không tồn tại, bỏ qua đổi tên.`,
        );
      }
    } catch (e) {
      if (e.codeName === "NamespaceNotFound")
        console.log(
          `   -> ℹ️ Collection ${oldName} không tồn tại, bỏ qua đổi tên.`,
        );
      else throw e;
    }
    try {
      const newCollections = await db
        .listCollections({ name: newName })
        .toArray();
      if (newCollections.length > 0) {
        await db.collection(newName).rename(oldName);
        console.log(`   -> ✅ Đã đổi tên ${newName} -> ${oldName}`);
      }
    } catch (e) {
      if (e.codeName !== "NamespaceNotFound") throw e;
    }
  };

  await renameAndDrop("customers", "customers_new");
  try {
    const statusesCollection = await db
      .listCollections({ name: "statuses" })
      .toArray();
    if (statusesCollection.length > 0) {
      await db.collection("statuses").drop();
      console.log("   -> ✅ Đã xóa collection 'statuses' cũ.");
    }
  } catch (e) {
    if (e.codeName !== "NamespaceNotFound") throw e;
  }
}

async function verifyMigration() {
  console.log("\n--- ⭐ Bước 5: Kiểm tra dữ liệu sau khi di trú ---");
  const randomCustomer = await Customer.findOne()
    .populate([
      { path: "programEnrollments.programId", select: "name statuses stages" },
      { path: "users", select: "name" },
    ])
    .lean();

  if (randomCustomer) {
    console.log("   -> Dữ liệu một khách hàng ngẫu nhiên:");
    console.log(
      JSON.stringify(
        {
          _id: randomCustomer._id,
          name: randomCustomer.name,
          phone: randomCustomer.phone,
          users: (randomCustomer.users || []).map((u) => u.name),
          program: randomCustomer.programEnrollments[0]?.programId.name,
        },
        null,
        2,
      ),
    );

    const enrollment = randomCustomer.programEnrollments[0];
    if (enrollment) {
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
    }
  } else {
    console.log("   -> ⚠️ Không tìm thấy khách hàng nào để kiểm tra.");
  }
}

// =================================================================
// === MAIN EXECUTION (HÀM CHẠY CHÍNH) ===
// =================================================================

async function runMigration() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }
  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    await migrateInitialSetup();
    await migrateStatusesAndTemplates();
    await migrateCustomers();
    // await migrateActionHistories(); // Tạm thời vô hiệu hóa vì phức tạp và không có dữ liệu cũ để test
    await finalizeMigration();
    await verifyMigration();
  } catch (error) {
    console.error(
      "❌ Đã xảy ra lỗi nghiêm trọng trong quá trình di trú:",
      error,
    );
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB. Quá trình kết thúc.");
  }
}

runMigration();
