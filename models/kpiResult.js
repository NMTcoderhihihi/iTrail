// models/kpiResult.js
import { Schema, model, models } from "mongoose";

const KeyValueSchema = new Schema(
  { key: String, value: Schema.Types.Mixed },
  { _id: false },
);

const KpiResultSchema = new Schema(
  {
    layoutId: {
      type: Schema.Types.ObjectId,
      ref: "reportLayout",
      required: true,
    },
    parametersUsed: [KeyValueSchema],
    rawDataSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    exportedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    exportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const KpiResult = models.kpiResult || model("kpiResult", KpiResultSchema);

export default KpiResult;
