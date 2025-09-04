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

// THAY THẾ KeyDefinitionSchema CŨ BẰNG ĐOẠN NÀY
const KeyDefinitionSchema = new Schema(
  {
    name: { type: String, required: true },
    // ** MODIFIED: Thêm trường `type` để định nghĩa kiểu dữ liệu
    type: {
      type: String,
      required: true,
      enum: [
        "string",
        "number",
        "date",
        "boolean",
        "objectId",
        "object",
        "array_string",
        "array_objectId",
      ],
    },
  },
  { _id: false },
);

// THAY THẾ ActionTypeDefinitionSchema CŨ BẰNG ĐOẠN NÀY
const ActionTypeDefinitionSchema = new Schema(
  {
    actionType: { type: String, unique: true, lowercase: true },
    description: String,
    requiredContextKeys: [KeyDefinitionSchema],
    requiredDetailKeys: [KeyDefinitionSchema],
  },
  { collection: "actiontypedefinitions" },
);

// ** MODIFIED: value là Mixed, bỏ trường `type`
const ValueEntrySchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);
const ActionHistorySchema = new Schema(
  {
    actionTypeId: {
      type: mongoose.Types.ObjectId,
      ref: "actionTypeDefinition",
    },
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
  mongoose.model("actionTypeDefinition", ActionTypeDefinitionSchema);
const ActionHistory =
  mongoose.models.actionHistory ||
  mongoose.model("actionHistory", ActionHistorySchema);
const MessageTemplate =
  mongoose.models.messageTemplate ||
  mongoose.model("messageTemplate", MessageTemplateSchema);

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

  // ** MODIFIED: Yêu cầu 4 - Rà soát và cập nhật toàn bộ ActionTypeDefinitions
  console.log("   -> Đồng bộ hóa ActionTypeDefinitions...");

  // 4. Định nghĩa đầy đủ các loại hành động
  // scripts/migrate-db.js -> bên trong hàm migrateInitialSetup

  // 4. Định nghĩa đầy đủ các loại hành động
  const actionTypes = [
    // === NHÓM 1: CẬP NHẬT KHÁCH HÀNG (GỘP CHUNG) ===
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
      actionType: "update_customer_enrollment",
      description: "Cập nhật thông tin ghi danh của KH (stage, status).",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "programId", type: "objectId" },
      ],
      detailKeys: [
        { name: "fieldName", type: "string" },
        { name: "oldValue", type: "objectId" },
        { name: "newValue", type: "objectId" },
      ],
    },
    {
      actionType: "add_customer_comment",
      contextKeys: [{ name: "customerId", type: "objectId" }],
      detailKeys: [{ name: "commentId", type: "objectId" }],
    },

    // === NHÓM 2: QUẢN LÝ LỊCH TRÌNH (TÁCH BIỆT) ===
    {
      actionType: "create_schedule_send_message",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [
        { name: "scheduleId", type: "objectId" },
        { name: "scheduledFor", type: "date" },
        { name: "messageTemplate", type: "string" },
      ],
    },
    {
      actionType: "create_schedule_add_friend",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [
        { name: "scheduleId", type: "objectId" },
        { name: "scheduledFor", type: "date" },
      ],
    },
    {
      actionType: "create_schedule_find_uid",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [
        { name: "scheduleId", type: "objectId" },
        { name: "scheduledFor", type: "date" },
      ],
    },
    {
      actionType: "delete_schedule_send_message",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [{ name: "scheduleId", type: "objectId" }],
    },
    {
      actionType: "delete_schedule_find_uid",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
      ],
      detailKeys: [{ name: "scheduleId", type: "objectId" }],
    },

    // === NHÓM 3: THỰC THI & HỦY TÁC VỤ (TÁCH BIỆT) ===
    {
      actionType: "do_schedule_send_message",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "status", type: "string" },
        { name: "scriptResult", type: "object" },
        { name: "finalMessage", type: "string" },
      ],
    },
    {
      actionType: "do_schedule_add_friend",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "status", type: "string" },
        { name: "scriptResult", type: "object" },
      ],
    },
    {
      actionType: "do_schedule_find_uid",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "status", type: "string" },
        { name: "scriptResult", type: "object" },
      ],
    },
    {
      actionType: "auto_cancel_rate_limit",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "reasonRoot", type: "object" },
        { name: "description", type: "string" },
      ],
    },
    {
      actionType: "auto_cancel_zalo_failure",
      contextKeys: [
        { name: "customerId", type: "objectId" },
        { name: "zaloAccountId", type: "objectId" },
        { name: "scheduleId", type: "objectId" },
      ],
      detailKeys: [
        { name: "reasonRoot", type: "object" },
        { name: "description", type: "string" },
      ],
    },

    // Mở rộng cho tương lai
    { actionType: "assign_customer_user" },
    { actionType: "enroll_customer_in_program" },
    { actionType: "create_document" },
    { actionType: "update_document" },
    { actionType: "delete_document" },
  ];
  for (const at of actionTypes) {
    await ActionTypeDefinition.updateOne(
      { actionType: at.actionType },
      {
        $set: {
          requiredContextKeys: at.contextKeys || [],
          requiredDetailKeys: at.detailKeys || [],
        },
      },
      { upsert: true },
    );
  }
  console.log(
    `   -> ✅ Đã đồng bộ hóa ${actionTypes.length} ActionTypeDefinitions.`,
  );
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
async function cleanupEmptyComments() {
  console.log("\n--- Bước Phụ: Dọn dẹp các comment rỗng ---");
  // Sử dụng model Customer đã được định nghĩa để trỏ vào `customers_new`
  const result = await Customer.updateMany(
    { "comments.detail": { $in: [null, ""] } },
    { $pull: { comments: { detail: { $in: [null, ""] } } } },
  );
  if (result.modifiedCount > 0) {
    console.log(
      `   -> ✅ Đã dọn dẹp comment rỗng từ ${result.modifiedCount} khách hàng.`,
    );
  } else {
    console.log("   -> ℹ️ Không tìm thấy comment rỗng nào để dọn dẹp.");
  }
}

// ** ADDED: Hàm di trú lịch sử
// scripts/migrate-db.js

async function migrateActionHistories() {
  console.log("\n--- Bước 4: Di trú Lịch sử Hành động (ActionHistories) ---");

  const oldHistories = await History_Old.find().lean();
  if (oldHistories.length === 0) {
    console.log("   -> ℹ️ Không có lịch sử cũ để di trú.");
    return;
  }
  console.log(
    `   -> Tìm thấy ${oldHistories.length} bản ghi lịch sử cũ. Bắt đầu xử lý...`,
  );

  const actionTypeDefs = await ActionTypeDefinition.find().lean();
  const actionTypeMap = new Map(
    actionTypeDefs.map((def) => [
      def.actionType.toUpperCase().replace(/_/g, ""),
      def._id,
    ]),
  );

  const program = await CareProgram.findById(DEFAULT_CARE_PROGRAM_ID).lean();

  // ++ ADDED: Safety Check to ensure the program document exists before proceeding.
  if (!program) {
    throw new Error(
      `Lỗi nghiêm trọng: Không thể tìm thấy CareProgram mặc định với ID: ${DEFAULT_CARE_PROGRAM_ID}. ` +
        `Vui lòng kiểm tra lại logic ở Bước 1 hoặc đảm bảo DB không bị thay đổi giữa các bước.`,
    );
  }

  const statusMap = new Map(program.statuses.map((s) => [s.name, s._id]));
  const stageMap = new Map(program.stages.map((s) => [s.name, s._id]));

  const newHistories = [];
  let skippedCount = 0;

  // ** ADDED: Bản đồ ánh xạ tên hành động cũ sang tên mới theo quy ước
  const ACTION_NAME_MAP = {
    UPDATE_NAME_CUSTOMER: "update_customer_core_info",
    UPDATE_STATUS_CUSTOMER: "update_customer_enrollment",
    UPDATE_STAGE_CUSTOMER: "update_customer_enrollment",
    ADD_COMMENT_CUSTOMER: "add_customer_comment",
    CREATE_SCHEDULE_SEND_MESSAGE: "create_schedule_send_message",
    CREATE_SCHEDULE_ADD_FRIEND: "create_schedule_add_friend",
    CREATE_SCHEDULE_FIND_UID: "create_schedule_find_uid",
    DELETE_SCHEDULE_SEND_MESSAGE: "delete_schedule_send_message",
    DELETE_SCHEDULE_FIND_UID: "delete_schedule_find_uid",
    DO_SCHEDULE_SEND_MESSAGE: "do_schedule_send_message",
    DO_SCHEDULE_ADD_FRIEND: "do_schedule_add_friend",
    DO_SCHEDULE_FIND_UID: "do_schedule_find_uid",
    AUTO_CANCEL_RATE_LIMIT: "auto_cancel_rate_limit",
    AUTO_CANCEL_ZALO_FAILURE: "auto_cancel_zalo_failure",
  };

  for (const oldLog of oldHistories) {
    const newActionName = ACTION_NAME_MAP[oldLog.action];
    if (!newActionName) {
      skippedCount++;
      continue;
    }

    const actionTypeId = actionTypeMap.get(
      newActionName.toUpperCase().replace(/_/g, ""),
    );
    if (!actionTypeId) {
      skippedCount++;
      continue;
    }

    const newLog = {
      _id: oldLog._id,
      actionTypeId,
      actorId: oldLog.user,
      time: oldLog.time,
      context: [],
      detail: [],
    };

    if (oldLog.customer)
      newLog.context.push({ key: "customerId", value: oldLog.customer });
    if (oldLog.zalo)
      newLog.context.push({ key: "zaloAccountId", value: oldLog.zalo });
    if (oldLog.actionDetail?.scheduleId)
      newLog.context.push({
        key: "scheduleId",
        value: oldLog.actionDetail.scheduleId,
      });

    switch (oldLog.action) {
      case "UPDATE_NAME_CUSTOMER":
        newLog.detail.push({ key: "fieldName", value: "name" });
        newLog.detail.push({
          key: "oldValue",
          value: oldLog.actionDetail.oldName,
        });
        newLog.detail.push({
          key: "newValue",
          value: oldLog.actionDetail.newName,
        });
        break;
      case "UPDATE_STATUS_CUSTOMER":
      case "UPDATE_STAGE_CUSTOMER":
        newLog.context.push({
          key: "programId",
          value: DEFAULT_CARE_PROGRAM_ID,
        });
        if (oldLog.action === "UPDATE_STATUS_CUSTOMER") {
          newLog.detail.push({ key: "fieldName", value: "statusId" });
          // ** FIXED: Xử lý giá trị undefined, gán null thay thế
          newLog.detail.push({
            key: "oldValue",
            value: statusMap.get(oldLog.actionDetail.oldStatus) || null,
          });
          newLog.detail.push({
            key: "newValue",
            value: statusMap.get(oldLog.actionDetail.newStatus) || null,
          });
        } else {
          newLog.detail.push({ key: "fieldName", value: "stageId" });
          newLog.detail.push({
            key: "oldValue",
            value: stageMap.get(oldLog.actionDetail.oldStage) || null,
          });
          newLog.detail.push({
            key: "newValue",
            value: stageMap.get(oldLog.actionDetail.newStage) || null,
          });
        }
        break;
      case "ADD_COMMENT_CUSTOMER":
        newLog.detail.push({
          key: "commentId",
          value: oldLog.actionDetail.commentId,
        });
        break;
      case "CREATE_SCHEDULE_SEND_MESSAGE":
      case "CREATE_SCHEDULE_ADD_FRIEND":
      case "CREATE_SCHEDULE_FIND_UID":
        newLog.detail.push({
          key: "scheduledFor",
          value: oldLog.actionDetail.scheduledFor,
        });
        if (oldLog.actionDetail.messageTemplate) {
          newLog.detail.push({
            key: "messageTemplate",
            value: oldLog.actionDetail.messageTemplate,
          });
        }
        break;
      case "DO_SCHEDULE_SEND_MESSAGE":
      case "DO_SCHEDULE_ADD_FRIEND":
      case "DO_SCHEDULE_FIND_UID":
        newLog.detail.push({ key: "status", value: oldLog.status.status });
        newLog.detail.push({
          key: "scriptResult",
          value: oldLog.status.detail,
        });
        if (oldLog.actionDetail.finalMessage) {
          newLog.detail.push({
            key: "finalMessage",
            value: oldLog.actionDetail.finalMessage,
          });
        }
        break;
      case "AUTO_CANCEL_RATE_LIMIT":
      case "AUTO_CANCEL_ZALO_FAILURE":
        newLog.detail.push({ key: "reasonRoot", value: oldLog.status.detail });
        newLog.detail.push({
          key: "description",
          value: oldLog.actionDetail.reasonMessage,
        });
        break;
    }
    newHistories.push(newLog);
  }

  if (skippedCount > 0) {
    console.log(
      `   -> ⚠️  Đã bỏ qua ${skippedCount} bản ghi lịch sử không có định nghĩa hành động tương ứng.`,
    );
  }

  if (newHistories.length > 0) {
    await ActionHistory.deleteMany({});
    await ActionHistory.insertMany(newHistories, { ordered: false }).catch(
      (err) => {
        // Ghi log lỗi chi tiết nếu có
        console.error(
          "Lỗi khi insertMany:",
          err.writeErrors ? JSON.stringify(err.writeErrors, null, 2) : err,
        );
      },
    );
    console.log(
      `   -> ✅ Đã di trú thành công ${newHistories.length} bản ghi lịch sử.`,
    );
  }
}

async function finalizeMigration() {
  console.log("\n--- Bước 5: Hoàn tất Di trú ---");
  const db = mongoose.connection.db;

  const renameCollection = async (oldName, newName, finalName) => {
    try {
      // Drop _old collection if it exists from previous runs
      try {
        await db.collection(`${oldName}_old`).drop();
        console.log(`   -> 🧹 Đã dọn dẹp collection cũ: ${oldName}_old`);
      } catch (e) {
        if (e.codeName !== "NamespaceNotFound") throw e;
      }

      // Rename current to _old
      const collections = await db.listCollections({ name: oldName }).toArray();
      if (collections.length > 0) {
        await db.collection(oldName).rename(`${oldName}_old`);
        console.log(`   -> ✅ Đã đổi tên ${oldName} -> ${oldName}_old`);
      }

      // Rename _new to current
      const newCollections = await db
        .listCollections({ name: newName })
        .toArray();
      if (newCollections.length > 0) {
        await db.collection(newName).rename(finalName);
        console.log(`   -> ✅ Đã đổi tên ${newName} -> ${finalName}`);
      }
    } catch (e) {
      if (e.codeName !== "NamespaceNotFound") {
        console.error(`Lỗi khi đổi tên collection: ${e.message}`);
        throw e;
      }
    }
  };

  await renameCollection("customers", "customers_new", "customers");
  await renameCollection(
    "actionhistories",
    "actionhistories_new",
    "actionhistories",
  );

  try {
    await db.collection("status").drop();
    console.log("   -> ✅ Đã xóa collection 'status' cũ.");
  } catch (e) {
    if (e.codeName !== "NamespaceNotFound") throw e;
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
    await cleanupEmptyComments();
    await migrateActionHistories();
    await finalizeMigration();
  } catch (error) {
    console.error(
      "❌ Đã xảy ra lỗi nghiêm trọng trong quá trình di trú:",
      error,
    );
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log(
        "\n🔌 Đã ngắt kết nối khỏi MongoDB. Quá trình di trú kết thúc.",
      );
    }
  }
}

runMigration();
