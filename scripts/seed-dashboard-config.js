// [ADD] scripts/seed-dashboard-config.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT ĐỊNH NGHĨA DATASOURCE & REPORT LAYOUT CHO DASHBOARD ===
// =================================================================

// --- Định nghĩa Schema ---
const DataSourceSchema = new Schema(
  {},
  { strict: false, collection: "datasources" },
);
const ReportLayoutSchema = new Schema(
  {},
  { strict: false, collection: "reportlayouts" },
);

const DataSource =
  mongoose.models.dataSource || mongoose.model("dataSource", DataSourceSchema);
const ReportLayout =
  mongoose.models.reportLayout ||
  mongoose.model("reportLayout", ReportLayoutSchema);

// --- ID Cố định ---
const ADMIN_ID = new mongoose.Types.ObjectId("6865fe3ccdec836f29fabe4f");
const DS_TOTAL_CUSTOMERS_ID = new mongoose.Types.ObjectId(
  "69a3e3ebe986b54217cf0001",
);
const DS_CUSTOMERS_PER_PROGRAM_ID = new mongoose.Types.ObjectId(
  "69a3e3ebe986b54217cf0002",
);
const CLIENT_DASHBOARD_LAYOUT_ID = new mongoose.Types.ObjectId(
  "69a3e3ebe986b54217cf1001",
);

// --- Định nghĩa DataSources ---
const dataSources = [
  {
    _id: DS_TOTAL_CUSTOMERS_ID,
    name: "DS_Total_Customers",
    description: "Đếm tổng số khách hàng trong hệ thống.",
    connectorType: "local_mongodb",
    databasePipeline: [{ $count: "total" }],
    outputSchema: [{ fieldName: "total", fieldType: "number" }],
    createdBy: ADMIN_ID,
  },
  {
    _id: DS_CUSTOMERS_PER_PROGRAM_ID,
    name: "DS_Customers_Per_Program",
    description: "Đếm số lượng khách hàng theo từng chương trình chăm sóc.",
    connectorType: "local_mongodb",
    databasePipeline: [
      { $unwind: "$programEnrollments" },
      {
        $lookup: {
          from: "careprograms",
          localField: "programEnrollments.programId",
          foreignField: "_id",
          as: "program",
        },
      },
      { $unwind: "$program" },
      { $group: { _id: "$program.name", count: { $sum: 1 } } },
      { $project: { programName: "$_id", count: 1, _id: 0 } },
    ],
    outputSchema: [
      { fieldName: "programName", fieldType: "string" },
      { fieldName: "count", fieldType: "number" },
    ],
    createdBy: ADMIN_ID,
  },
];

// --- Định nghĩa Report Layout ---
const clientDashboardLayout = {
  _id: CLIENT_DASHBOARD_LAYOUT_ID,
  layoutName: "client_dashboard_layout",
  description: "Layout cho dashboard chính của trang Client",
  widgets: [
    {
      widgetType: "kpi_card",
      // Widget này sử dụng 2 datasource để lấy 2 chỉ số khác nhau
      dataSources: [
        { dataSourceId: DS_TOTAL_CUSTOMERS_ID, selectedFields: ["total"] },
        {
          dataSourceId: DS_CUSTOMERS_PER_PROGRAM_ID,
          selectedFields: ["programName", "count"],
        },
      ],
      dataMapping: [
        // Ánh xạ field 'total' từ DS_TOTAL_CUSTOMERS_ID vào param 'totalCustomers' của widget
        {
          widgetParam: "totalCustomers",
          source: { dataSourceId: DS_TOTAL_CUSTOMERS_ID, fieldName: "total" },
        },
        // Ánh xạ kết quả (mảng object) từ DS_CUSTOMERS_PER_PROGRAM_ID vào param 'customersPerProgram'
        {
          widgetParam: "customersPerProgram",
          source: {
            dataSourceId: DS_CUSTOMERS_PER_PROGRAM_ID,
            fieldName: "result",
          },
        },
      ],
    },
  ],
};

// --- Hàm thực thi ---
async function seedDashboardConfig() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ MONGODB_URI is not set.");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected!");

    for (const ds of dataSources) {
      await DataSource.updateOne(
        { _id: ds._id },
        { $set: ds },
        { upsert: true },
      );
      console.log(`   -> Upserted DataSource: ${ds.name}`);
    }

    await ReportLayout.updateOne(
      { _id: clientDashboardLayout._id },
      { $set: clientDashboardLayout },
      { upsert: true },
    );
    console.log(
      `   -> Upserted ReportLayout: ${clientDashboardLayout.layoutName}`,
    );
  } catch (error) {
    console.error("❌ Error seeding dashboard config:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
  }
}

seedDashboardConfig();
