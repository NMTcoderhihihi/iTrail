// models/dataSource.js
import { Schema, model, models } from "mongoose";

// Schema con để định nghĩa các tham số đầu vào/ra
const ParamDefinitionSchema = new Schema(
  {
    paramName: { type: String, required: true }, // Tên biến trong logic, vd: "startDate"
    paramLabel: { type: String }, // Nhãn hiển thị trên UI, vd: "Ngày bắt đầu"
    paramType: {
      type: String,
      required: true,
      enum: ["string", "number", "date", "objectId", "boolean"],
    },
  },
  { _id: false },
);

const OutputFieldSchema = new Schema(
  {
    fieldName: { type: String, required: true }, // Tên trường dữ liệu trả về, vd: "totalSales"
    fieldLabel: { type: String }, // Nhãn hiển thị, vd: "Tổng doanh thu"
    fieldType: { type: String, required: true },
  },
  { _id: false },
);

// Schema con cho các bước xử lý dữ liệu từ nguồn ngoài
const ProcessingStepSchema = new Schema(
  {
    step: { type: Number, required: true },
    action: { type: String, required: true }, // Tên hàm nguyên thủy, vd: "normalize_phone"
    params: { type: Schema.Types.Mixed }, // Object chứa các tham số cho hàm nguyên thủy
  },
  { _id: false },
);

// Schema chính
const DataSourceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String, trim: true },

    connectorType: {
      type: String,
      required: true,
      enum: ["api", "google_sheet", "local_mongodb"],
    },

    // A. Dùng cho connectorType là "api" hoặc "google_sheet"
    connectionConfig: {
      type: {
        // **MODIFIED**: Chuẩn hóa thành dạng key-value động
        params: [{ key: String, value: String }],
        // "Hướng dẫn" xử lý dữ liệu sau khi lấy về
        processingPipeline: [ProcessingStepSchema],
      },
      default: null,
    },

    // B. Dùng cho connectorType là "local_mongodb"
    databasePipeline: {
      type: [Schema.Types.Mixed], // Mảng chứa các stage của MongoDB Aggregation
      default: null,
    },

    inputParams: [ParamDefinitionSchema],
    outputSchema: [OutputFieldSchema],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

const DataSource = models.dataSource || model("dataSource", DataSourceSchema);

export default DataSource;
