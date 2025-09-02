// models/variant.js
import { Schema, model, models } from "mongoose";

// Schema con cho cấu hình truy vấn động
const DynamicConfigSchema = new Schema(
  {
    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: "dataSource",
      required: true,
    },
    // Ánh xạ dữ liệu từ môi trường (vd: khách hàng hiện tại) vào tham số của dataSource
    inputMapping: [
      {
        paramName: { type: String, required: true }, // Tên tham số của dataSource, vd: "customerId"
        source: {
          type: String,
          required: true,
          enum: ["customer", "user", "program"],
        }, // Nguồn dữ liệu context
        valueField: { type: String, required: true }, // Tên trường cần lấy giá trị, vd: '_id'
      },
    ],
    // Chuỗi mẫu để định dạng kết quả trả về từ dataSource
    outputTemplate: {
      type: String,
      required: true,
      // Ví dụ: "Chào bạn {result.name}, bạn có điểm tổng là {result.diem_xt}"
    },
  },
  { _id: false },
);

// Schema chính
const VariantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["STATIC_LIST", "DYNAMIC_QUERY"],
      default: "STATIC_LIST",
    },
    // Chỉ dùng khi type là STATIC_LIST
    staticContent: {
      type: [String],
      default: undefined,
    },
    // Chỉ dùng khi type là DYNAMIC_QUERY
    dynamicConfig: {
      type: DynamicConfigSchema,
      default: undefined,
    },
  },
  { timestamps: true },
);

const Variant = models.variant || model("variant", VariantSchema);

export default Variant;
