// models/actionHistory.js
import { Schema, model, models } from "mongoose";

const ValueEntrySchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: [Schema.Types.Mixed], required: true },
    type: { type: String, required: true },
  },
  { _id: false },
);

const ActionHistorySchema = new Schema(
  {
    actionTypeId: {
      type: Schema.Types.ObjectId,
      ref: "actionTypeDefinition",
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    context: [ValueEntrySchema],
    detail: [ValueEntrySchema],
    time: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }, // Tắt timestamps mặc định vì đã có trường 'time'
);

const ActionHistory =
  models.actionHistory || model("actionHistory", ActionHistorySchema);

export default ActionHistory;
