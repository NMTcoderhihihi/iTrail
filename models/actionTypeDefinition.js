// models/actionTypeDefinition.js
import { Schema, model, models } from "mongoose";

const KeyDefinitionSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["string", "number", "date", "boolean", "objectId"],
    },
  },
  { _id: false },
);

const ActionTypeDefinitionSchema = new Schema(
  {
    actionType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: { type: String },
    requiredContextKeys: [KeyDefinitionSchema],
    requiredDetailKeys: [KeyDefinitionSchema],
  },
  { timestamps: true },
);

const ActionTypeDefinition =
  models.actionTypeDefinition ||
  model("actionTypeDefinition", ActionTypeDefinitionSchema);

export default ActionTypeDefinition;
