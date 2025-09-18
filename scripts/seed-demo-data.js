// [FIX] scripts/seed-demo-data.js
// Sửa lỗi cú pháp import Mongoose để tương thích với môi trường Node.js hiện tại.
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config({ path: ".env" });

const { Schema } = mongoose;

// =================================================================
// === CONFIGURATION (CẤU HÌNH) ===
// =================================================================
const ADMIN_EMAIL = "test@gmail.com"; // QUAN TRỌNG: Thay đổi nếu email admin của bạn khác
const GOOGLE_SHEET_ID = "1GRRJr-oJm9umkekd8MhttCxQgY7hRuyCtA2iINUpJFQ"; // QUAN TRỌNG: Thay ID Google Sheet của bạn vào đây

const color = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

// =================================================================
// === ĐỊNH NGHĨA SCHEMA & MODEL NGAY TRONG SCRIPT ===
// =================================================================

const UserSchema = new Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  email: String,
  password: String,
  role: String,
  zaloActive: Schema.Types.ObjectId,
});
const ZaloAccountSchema = new Schema({
  _id: Schema.Types.ObjectId,
  uid: String,
  name: String,
  phone: String,
  users: [Schema.Types.ObjectId],
});
const TagSchema = new Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  detail: String,
  createdBy: Schema.Types.ObjectId,
});
const CareProgramSchema = new Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  description: String,
  isActive: Boolean,
  createdBy: Schema.Types.ObjectId,
  stages: [
    new Schema({ _id: Schema.Types.ObjectId, name: String, level: Number }),
  ],
  statuses: [new Schema({ _id: Schema.Types.ObjectId, name: String })],
});
const CustomerSchema = new Schema({
  name: String,
  phone: String,
  users: [Schema.Types.ObjectId],
  tags: [Schema.Types.ObjectId],
  programEnrollments: [
    new Schema(
      {
        programId: Schema.Types.ObjectId,
        stageId: Schema.Types.ObjectId,
        statusId: Schema.Types.ObjectId,
      },
      { _id: false },
    ),
  ],
});
const DataSourceSchema = new Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  description: String,
  connectorType: String,
  connectionConfig: Object,
  inputParams: Array,
  createdBy: Schema.Types.ObjectId,
});
const FieldDefinitionSchema = new Schema({
  _id: Schema.Types.ObjectId,
  fieldName: String,
  fieldLabel: String,
  fieldType: String,
  dataSourceIds: [Schema.Types.ObjectId],
  displayRules: Array,
  createdBy: Schema.Types.ObjectId,
});
const MessageTemplateSchema = new Schema({
  name: String,
  description: String,
  content: String,
  createdBy: Schema.Types.ObjectId,
});
const VariantSchema = new Schema({
  name: String,
  description: String,
  type: String,
  staticContent: [String],
});
const ActionHistorySchema = new Schema({
  actionTypeId: Schema.Types.ObjectId,
  actorId: Schema.Types.ObjectId,
  context: Array,
  detail: Array,
  time: Date,
});
const ActionTypeDefinitionSchema = new Schema({ actionType: String });
const ScheduledJobSchema = new Schema({}, { strict: false });
const ArchivedJobSchema = new Schema({}, { strict: false });

const User = mongoose.models.user || mongoose.model("user", UserSchema);
const ZaloAccount =
  mongoose.models.zaloaccount ||
  mongoose.model("zaloaccount", ZaloAccountSchema);
const Tag = mongoose.models.tag || mongoose.model("tag", TagSchema);
const CareProgram =
  mongoose.models.careProgram ||
  mongoose.model("careProgram", CareProgramSchema);
const Customer =
  mongoose.models.customer || mongoose.model("customer", CustomerSchema);
const DataSource =
  mongoose.models.dataSource || mongoose.model("dataSource", DataSourceSchema);
const FieldDefinition =
  mongoose.models.fieldDefinition ||
  mongoose.model("fieldDefinition", FieldDefinitionSchema);
const MessageTemplate =
  mongoose.models.messagetemplate ||
  mongoose.model("messagetemplate", MessageTemplateSchema);
const Variant =
  mongoose.models.variant || mongoose.model("variant", VariantSchema);
const ActionHistory =
  mongoose.models.actionHistory ||
  mongoose.model("actionHistory", ActionHistorySchema);
const ActionTypeDefinition =
  mongoose.models.actionTypeDefinition ||
  mongoose.model("actionTypeDefinition", ActionTypeDefinitionSchema);
const ScheduledJob =
  mongoose.models.scheduledjob ||
  mongoose.model("scheduledjob", ScheduledJobSchema);
const ArchivedJob =
  mongoose.models.archivedjob ||
  mongoose.model("archivedjob", ArchivedJobSchema);

// ... (Phần còn lại của file script giữ nguyên, chỉ cần copy từ đây trở xuống) ...

// =================================================================
// === DATA MẪU (DEMO DATA) ===
// =================================================================
let seedData = {};

async function defineSeedData() {
  const adminUser = await User.findOne({ email: ADMIN_EMAIL }).lean();
  if (!adminUser) {
    console.error(
      color.red(
        `Lỗi nghiêm trọng: Không tìm thấy người dùng Admin với email: ${ADMIN_EMAIL}. Vui lòng kiểm tra lại.`,
      ),
    );
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash("123456", 10);

  const ADMIN_ID = adminUser._id;
  const employeeId1 = new mongoose.Types.ObjectId();
  const employeeId2 = new mongoose.Types.ObjectId();
  const zaloAccountId1 = new mongoose.Types.ObjectId();
  const zaloAccountId2 = new mongoose.Types.ObjectId();
  const programIdVip = new mongoose.Types.ObjectId();
  const programIdRegular = new mongoose.Types.ObjectId();
  const programIdSupport = new mongoose.Types.ObjectId();
  const tagIdVip = new mongoose.Types.ObjectId();
  const tagIdPotential = new mongoose.Types.ObjectId();
  const tagIdComplaint = new mongoose.Types.ObjectId();
  const googleSheetDataSourceId = new mongoose.Types.ObjectId();
  const internalDbDataSourceId = new mongoose.Types.ObjectId(
    "69a3e3ebe986b54217cfdead",
  );
  const fieldDefSheetValue = new mongoose.Types.ObjectId();
  const fieldDefSheetCategory = new mongoose.Types.ObjectId();
  const fieldDefManualFacebook = new mongoose.Types.ObjectId();
  const fieldDefManualSatisfaction = new mongoose.Types.ObjectId();

  const programs = [
    {
      _id: programIdVip,
      name: "Chăm sóc khách hàng VIP",
      description: "Chương trình với ưu đãi độc quyền cho khách VIP.",
      isActive: true,
      createdBy: ADMIN_ID,
      stages: [
        { _id: new mongoose.Types.ObjectId(), name: "Chào mừng", level: 1 },
        { _id: new mongoose.Types.ObjectId(), name: "Tặng voucher", level: 2 },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Chăm sóc định kỳ",
          level: 3,
        },
      ],
      statuses: [
        { _id: new mongoose.Types.ObjectId(), name: "VIP01 | Đã nhận ưu đãi" },
        { _id: new mongoose.Types.ObjectId(), name: "VIP02 | Đã liên hệ" },
      ],
    },
    {
      _id: programIdRegular,
      name: "Khách hàng thân thiết",
      description: "Quy trình bán hàng và chăm sóc khách hàng thông thường.",
      isActive: true,
      createdBy: ADMIN_ID,
      stages: [
        { _id: new mongoose.Types.ObjectId(), name: "Tiếp cận", level: 1 },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Tư vấn sản phẩm",
          level: 2,
        },
        { _id: new mongoose.Types.ObjectId(), name: "Gửi báo giá", level: 3 },
        { _id: new mongoose.Types.ObjectId(), name: "Chốt đơn", level: 4 },
      ],
      statuses: [
        { _id: new mongoose.Types.ObjectId(), name: "Đang phân vân" },
        { _id: new mongoose.Types.ObjectId(), name: "So sánh giá" },
        { _id: new mongoose.Types.ObjectId(), name: "Từ chối mua" },
      ],
    },
    {
      _id: programIdSupport,
      name: "Quy trình xử lý Khiếu nại",
      description: "Quy trình chuẩn để xử lý các vấn đề của khách hàng.",
      isActive: true,
      createdBy: ADMIN_ID,
      stages: [
        { _id: new mongoose.Types.ObjectId(), name: "Tiếp nhận", level: 1 },
        { _id: new mongoose.Types.ObjectId(), name: "Đang xử lý", level: 2 },
        { _id: new mongoose.Types.ObjectId(), name: "Hoàn tất", level: 3 },
      ],
      statuses: [
        { _id: new mongoose.Types.ObjectId(), name: "Chờ phản hồi khách" },
        { _id: new mongoose.Types.ObjectId(), name: "Đã giải quyết, hài lòng" },
        { _id: new mongoose.Types.ObjectId(), name: "Không hài lòng" },
      ],
    },
  ];

  seedData = {
    users: [
      {
        _id: employeeId1,
        name: "Lê Minh Tuấn",
        email: "tuan.le@itrail.com",
        password: hashedPassword,
        role: "Employee",
        zaloActive: zaloAccountId1,
      },
      {
        _id: employeeId2,
        name: "Phạm Thị Cúc",
        email: "cuc.pham@itrail.com",
        password: hashedPassword,
        role: "Employee",
        zaloActive: zaloAccountId2,
      },
    ],
    zaloAccounts: [
      {
        _id: zaloAccountId1,
        uid: "123456789",
        name: "CSKH Tuấn Lê",
        phone: "0910000001",
        users: [employeeId1],
      },
      {
        _id: zaloAccountId2,
        uid: "987654321",
        name: "CSKH Cúc Phạm",
        phone: "0910000002",
        users: [employeeId2],
      },
    ],
    tags: [
      {
        _id: tagIdVip,
        name: "Khách hàng VIP",
        detail: "Doanh số trên 50 triệu/năm",
        createdBy: ADMIN_ID,
      },
      {
        _id: tagIdPotential,
        name: "Khách hàng tiềm năng",
        detail: "Đã có tương tác, chưa mua hàng",
        createdBy: ADMIN_ID,
      },
      {
        _id: tagIdComplaint,
        name: "Cần xử lý khiếu nại",
        detail: "Khách hàng có vấn đề cần giải quyết",
        createdBy: ADMIN_ID,
      },
    ],
    carePrograms: programs,
    customers: [
      {
        name: "Trần Văn Hùng",
        phone: "0912345678",
        users: [employeeId1],
        tags: [tagIdVip],
        programEnrollments: [
          {
            programId: programIdVip,
            stageId: programs[0].stages[1]._id,
            statusId: programs[0].statuses[1]._id,
          },
        ],
      },
      {
        name: "Lê Thị Lan",
        phone: "0987654321",
        users: [employeeId2],
        tags: [tagIdPotential],
        programEnrollments: [
          {
            programId: programIdRegular,
            stageId: programs[1].stages[0]._id,
            statusId: programs[1].statuses[0]._id,
          },
        ],
      },
      {
        name: "Phạm Văn Đức",
        phone: "0912111222",
        users: [employeeId1],
        tags: [],
        programEnrollments: [
          {
            programId: programIdRegular,
            stageId: programs[1].stages[2]._id,
            statusId: programs[1].statuses[1]._id,
          },
        ],
      },
      {
        name: "Nguyễn Thị Mai",
        phone: "0912333444",
        users: [employeeId2],
        tags: [tagIdComplaint],
        programEnrollments: [
          {
            programId: programIdSupport,
            stageId: programs[2].stages[1]._id,
            statusId: programs[2].statuses[0]._id,
          },
        ],
      },
      {
        name: "Hoàng Văn Nam",
        phone: "0912555666",
        users: [employeeId1],
        tags: [tagIdVip, tagIdPotential],
        programEnrollments: [
          {
            programId: programIdVip,
            stageId: programs[0].stages[2]._id,
            statusId: programs[0].statuses[0]._id,
          },
        ],
      },
      {
        name: "Vũ Thị Hoa",
        phone: "0987777888",
        users: [employeeId2],
        tags: [],
        programEnrollments: [
          {
            programId: programIdRegular,
            stageId: programs[1].stages[3]._id,
            statusId: programs[1].statuses[2]._id,
          },
        ],
      },
      {
        name: "Đặng Văn Bảy",
        phone: "0912999000",
        users: [employeeId1],
        tags: [tagIdPotential],
        programEnrollments: [],
      },
      {
        name: "Bùi Thị Thu",
        phone: "0987123456",
        users: [employeeId2],
        tags: [],
        programEnrollments: [
          { programId: programIdRegular, stageId: programs[1].stages[1]._id },
        ],
      },
      {
        name: "Đỗ Văn Chín",
        phone: "0912123123",
        users: [employeeId1],
        tags: [tagIdComplaint],
        programEnrollments: [
          {
            programId: programIdSupport,
            stageId: programs[2].stages[2]._id,
            statusId: programs[2].statuses[1]._id,
          },
        ],
      },
      {
        name: "Ngô Thị Mười",
        phone: "0987987987",
        users: [employeeId2],
        tags: [tagIdVip],
        programEnrollments: [
          { programId: programIdVip, stageId: programs[0].stages[0]._id },
        ],
      },
    ],
    dataSources: [
      {
        _id: googleSheetDataSourceId,
        name: "GoogleSheet_Order_History",
        description: "Lấy lịch sử đơn hàng gần nhất từ Google Sheet.",
        connectorType: "google_sheet",
        connectionConfig: {
          params: [
            { key: "spreadsheetId", value: GOOGLE_SHEET_ID },
            { key: "range", value: "A:C" },
          ],
          processingPipeline: [],
        },
        inputParams: [
          {
            paramName: "sdt",
            paramLabel: "SĐT Khách hàng",
            paramType: "string",
          },
        ],
        createdBy: ADMIN_ID,
      },
    ],
    fieldDefinitions: [
      {
        _id: fieldDefSheetValue,
        fieldName: "last_order_value",
        fieldLabel: "Giá trị đơn hàng cuối",
        fieldType: "number",
        dataSourceIds: [googleSheetDataSourceId],
        displayRules: [
          {
            placement: "COMMON",
            conditions: {
              operator: "OR",
              requiredTags: [tagIdVip],
              requiredPrograms: [programIdRegular],
            },
          },
        ],
        createdBy: ADMIN_ID,
      },
      {
        _id: fieldDefSheetCategory,
        fieldName: "favorite_product_category",
        fieldLabel: "Ngành hàng yêu thích",
        fieldType: "string",
        dataSourceIds: [googleSheetDataSourceId],
        displayRules: [
          {
            placement: "COMMON",
            conditions: { operator: "AND", requiredTags: [tagIdVip] },
          },
        ],
        createdBy: ADMIN_ID,
      },
      {
        _id: fieldDefManualFacebook,
        fieldName: "facebook_link",
        fieldLabel: "Link Facebook",
        fieldType: "string",
        dataSourceIds: [internalDbDataSourceId],
        displayRules: [
          {
            placement: "COMMON",
            conditions: {
              operator: "OR",
              requiredTags: [],
              requiredPrograms: [],
            },
          },
        ],
        createdBy: ADMIN_ID,
      },
      {
        _id: fieldDefManualSatisfaction,
        fieldName: "satisfaction_level",
        fieldLabel: "Mức độ hài lòng",
        fieldType: "string",
        dataSourceIds: [internalDbDataSourceId],
        displayRules: [
          {
            // Chỉ hiện khi KH trong chương trình khiếu nại
            placement: "PROGRAM",
            conditions: {
              operator: "AND",
              requiredPrograms: [programIdSupport],
            },
          },
        ],
        createdBy: ADMIN_ID,
      },
    ],
    messageTemplates: [
      {
        name: "welcome_vip",
        description: "Chào mừng khách hàng VIP",
        content:
          "Chào {chao_hoi} {name}, cảm ơn bạn đã trở thành khách hàng VIP của chúng tôi! Chúng tôi xin gửi tặng bạn một voucher đặc biệt.",
        createdBy: ADMIN_ID,
      },
      {
        name: "complaint_response",
        description: "Phản hồi khiếu nại",
        content:
          "Chào {chao_hoi} {name}, chúng tôi đã tiếp nhận và đang xử lý vấn đề của bạn. Chuyên viên sẽ liên hệ lại trong thời gian sớm nhất. {cam_on}!",
        createdBy: ADMIN_ID,
      },
    ],
    variants: [
      {
        name: "chao_hoi",
        description: "Các cách chào hỏi",
        type: "STATIC_LIST",
        staticContent: ["bạn", "anh", "chị", "quý khách"],
      },
      {
        name: "cam_on",
        description: "Các cách cảm ơn",
        type: "STATIC_LIST",
        staticContent: ["Cảm ơn bạn", "Trân trọng cảm ơn", "Xin cảm ơn"],
      },
    ],
  };
}

async function clearDatabase() {
  console.log(color.yellow("\n--- Bước 1: Xóa dữ liệu cũ ---"));
  const collections = [
    Customer,
    Tag,
    CareProgram,
    DataSource,
    FieldDefinition,
    MessageTemplate,
    Variant,
    ActionHistory,
    ScheduledJob,
    ArchivedJob,
    ZaloAccount,
  ];
  for (const model of collections) {
    // Bỏ qua datasource hệ thống
    if (model.collection.name === "datasources") {
      await model.deleteMany({
        _id: { $ne: new mongoose.Types.ObjectId("69a3e3ebe986b54217cfdead") },
      });
    } else {
      await model.deleteMany({});
    }
    console.log(`   -> ✅ Đã xóa sạch collection: ${model.collection.name}`);
  }
  await User.deleteMany({ email: { $ne: ADMIN_EMAIL } });
  console.log(`   -> ✅ Đã xóa các User (trừ Admin).`);
}

async function seedDatabase() {
  console.log(color.yellow("\n--- Bước 2: Thêm dữ liệu mẫu ---"));
  await User.insertMany(seedData.users);
  console.log(`   -> ✅ Đã thêm ${seedData.users.length} Users.`);
  await ZaloAccount.insertMany(seedData.zaloAccounts);
  console.log(
    `   -> ✅ Đã thêm ${seedData.zaloAccounts.length} Zalo Accounts.`,
  );
  await Tag.insertMany(seedData.tags);
  console.log(`   -> ✅ Đã thêm ${seedData.tags.length} Tags.`);
  await CareProgram.insertMany(seedData.carePrograms);
  console.log(
    `   -> ✅ Đã thêm ${seedData.carePrograms.length} Care Programs.`,
  );
  await DataSource.insertMany(seedData.dataSources);
  console.log(`   -> ✅ Đã thêm ${seedData.dataSources.length} DataSources.`);
  await FieldDefinition.insertMany(seedData.fieldDefinitions);
  console.log(
    `   -> ✅ Đã thêm ${seedData.fieldDefinitions.length} Field Definitions.`,
  );
  await MessageTemplate.insertMany(seedData.messageTemplates);
  console.log(
    `   -> ✅ Đã thêm ${seedData.messageTemplates.length} Message Templates.`,
  );
  await Variant.insertMany(seedData.variants);
  console.log(`   -> ✅ Đã thêm ${seedData.variants.length} Variants.`);
  await Customer.insertMany(seedData.customers);
  console.log(`   -> ✅ Đã thêm ${seedData.customers.length} Customers.`);
}

async function seedHistoryAndCampaigns() {
  console.log(color.yellow("\n--- Bước 3: Tạo lịch sử và chiến dịch ảo ---"));
  const customers = await Customer.find().lean();
  const users = await User.find({ email: { $ne: ADMIN_EMAIL } }).lean();
  const actionTypes = await ActionTypeDefinition.find({
    actionType: /update/,
  }).lean();

  if (
    customers.length === 0 ||
    users.length === 0 ||
    actionTypes.length === 0
  ) {
    console.log(color.yellow("   -> Bỏ qua vì thiếu dữ liệu nền tảng."));
    return;
  }

  let historyLogs = [];
  for (let i = 0; i < 200; i++) {
    // Create 200 history logs
    const randomCustomer =
      customers[Math.floor(Math.random() * customers.length)];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomActionType =
      actionTypes[Math.floor(Math.random() * actionTypes.length)];
    const randomDate = new Date(
      Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
    );

    historyLogs.push({
      actionTypeId: randomActionType._id,
      actorId: randomUser._id,
      context: [{ key: "customerId", value: randomCustomer._id }],
      detail: [{ key: "note", value: "Hành động được tạo tự động" }],
      time: randomDate,
    });
  }

  await ActionHistory.insertMany(historyLogs);
  console.log(`   -> ✅ Đã tạo ${historyLogs.length} bản ghi lịch sử ảo.`);
}

async function main() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error(color.red("Lỗi: MONGODB_URI chưa được thiết lập."));
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log(color.green("✅ Kết nối MongoDB thành công!"));

    await defineSeedData();
    await clearDatabase();
    await seedDatabase();
    await seedHistoryAndCampaigns();

    console.log(
      color.green(
        "\n🎉 HOÀN TẤT! Đã tạo thành công bộ dữ liệu demo kinh doanh.",
      ),
    );
  } catch (error) {
    console.error(color.red("\n❌ Đã xảy ra lỗi nghiêm trọng:"), error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB.");
  }
}

main();
