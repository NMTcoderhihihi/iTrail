// [MOD] models/fieldDefinition.js
import { Schema, model, models } from "mongoose";

// [ADD] Schema con để định nghĩa một quy tắc hiển thị
const DisplayRuleSchema = new Schema(
  {
    // NƠI HIỂN THỊ: Quy định vị trí trường sẽ xuất hiện
    placement: {
      type: String,
      required: true,
      enum: ["COMMON", "PROGRAM"], // COMMON: Thông tin chung, PROGRAM: Bên trong chương trình
    },
    // BỘ ĐIỀU KIỆN: Định nghĩa các điều kiện cần thỏa mãn
    conditions: {
      operator: {
        type: String,
        required: true,
        enum: ["AND", "OR"],
        default: "AND",
      },
      requiredTags: [{ type: Schema.Types.ObjectId, ref: "tag" }],
      requiredPrograms: [{ type: Schema.Types.ObjectId, ref: "careProgram" }],
    },
  },
  { _id: false },
);

const FieldDefinitionSchema = new Schema(
  {
    fieldName: { type: String, required: true, unique: true, trim: true },
    fieldLabel: { type: String, required: true },
    fieldType: {
      type: String,
      required: true,
      enum: ["string", "number", "date", "boolean", "array_string", "objectId"],
    },
    description: { type: String },
    dataSourceIds: [{ type: Schema.Types.ObjectId, ref: "dataSource" }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    // [MOD] Thay thế các trường cũ bằng mảng displayRules mới
    displayRules: [DisplayRuleSchema],
  },
  { timestamps: true },
);

const FieldDefinition =
  models.fieldDefinition || model("fieldDefinition", FieldDefinitionSchema);

export default FieldDefinition;
