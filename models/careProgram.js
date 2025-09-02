// models/careProgram.js
import { Schema, model, models } from "mongoose";

const StageSchema = new Schema({
  name: { type: String, required: true },
  level: { type: Number, required: true },
  description: { type: String },
});

const StatusSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
});

const CareProgramSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    users: [{ type: Schema.Types.ObjectId, ref: "user" }],
    stages: [StageSchema],
    statuses: [StatusSchema],
  },
  { timestamps: true },
);

const CareProgram =
  models.careProgram || model("careProgram", CareProgramSchema);

export default CareProgram;
