// models/customer.js
import { Schema, model, models } from "mongoose";

// Định nghĩa các schema con được kế thừa từ source code cũ
const UidEntrySchema = new Schema(
  {
    zaloId: { type: Schema.Types.ObjectId, ref: "zaloaccount", required: true },
    uid: { type: String, required: true },
  },
  { _id: false },
);

const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user", required: true },
  detail: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

const ActionRefSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: "scheduledjob", required: true },
  },
  { _id: false, strict: false }, // Giữ nguyên strict: false như bản gốc
);

// Schema con cho các giá trị thuộc tính động
const AttributeValueSchema = new Schema(
  {
    definitionId: {
      type: Schema.Types.ObjectId,
      ref: "fieldDefinition",
      required: true,
    },
    value: { type: [Schema.Types.Mixed], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "user", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Schema con cho việc đăng ký tham gia chương trình
const ProgramEnrollmentSchema = new Schema(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: "careProgram",
      required: true,
    },
    stageId: { type: Schema.Types.ObjectId }, // Sẽ tham chiếu đến carePrograms.stages._id
    statusId: { type: Schema.Types.ObjectId }, // Sẽ tham chiếu đến carePrograms.statuses._id
    dataStatus: { type: String },
    programData: [AttributeValueSchema],
    enrolledAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Schema chính của Customer
const CustomerSchema = new Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    citizenId: { type: String, trim: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "tag" }],
    users: [{ type: Schema.Types.ObjectId, ref: "user" }],
    uid: [UidEntrySchema],
    comments: [CommentSchema],
    action: [ActionRefSchema],
    customerAttributes: [AttributeValueSchema],
    programEnrollments: [ProgramEnrollmentSchema],
  },
  { timestamps: true, strict: false }, // Dùng strict: false để tương thích với các trường cũ có thể còn sót lại
);

const Customer = models.customer || model("customer", CustomerSchema);

export default Customer;
