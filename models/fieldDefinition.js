// [MOD] models/fieldDefinition.js
import { Schema, model, models } from "mongoose";

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
    // [MOD] Thay thế isCommonAttribute bằng tagIds để linh hoạt hơn
    programIds: [{ type: Schema.Types.ObjectId, ref: "careProgram" }],
    tagIds: [{ type: Schema.Types.ObjectId, ref: "tag" }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

const FieldDefinition =
  models.fieldDefinition || model("fieldDefinition", FieldDefinitionSchema);

export default FieldDefinition;
