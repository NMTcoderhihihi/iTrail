// models/fieldDefinition.js
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
    isCommonAttribute: { type: Boolean, default: false },
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
