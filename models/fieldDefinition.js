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

    programIds: [{ type: Schema.Types.ObjectId, ref: "careProgram" }],
    tagIds: [{ type: Schema.Types.ObjectId, ref: "tag" }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    scope: {
      type: String,
      enum: ["CUSTOMER", "PROGRAM"],
      default: "CUSTOMER", // Mặc định là trường chung của khách hàng
      required: true,
    },

    displayCondition: {
      type: String,
      enum: ["ANY", "ALL"], // ANY = OR, ALL = AND
      default: "ANY", // Mặc định chỉ cần khớp 1 trong các điều kiện
      required: true,
    },
  },
  { timestamps: true },
);

const FieldDefinition =
  models.fieldDefinition || model("fieldDefinition", FieldDefinitionSchema);

export default FieldDefinition;
