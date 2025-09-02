// models/dataQuery.js
// ++ ADDED: Toàn bộ file này là mới
import { Schema, model, models } from "mongoose";

const dataQuerySchema = new Schema({
  queryName: { type: String, required: true, unique: true },
  queryLabel: { type: String, required: true },
  description: { type: String },
  dataPipeline: { type: [Object], required: true }, // Mảng các stage của MongoDB Aggregation
  parameters: [
    {
      key: String,
      label: String,
      type: { type: String, enum: ["String", "Number", "Date"] },
      defaultValue: Schema.Types.Mixed,
    },
  ],
});

const DataQuery = models.dataquery || model("dataquery", dataQuerySchema);
export default DataQuery;
