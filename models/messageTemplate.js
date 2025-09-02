// models/messageTemplate.js

// ** MODIFIED: Đổi tên file từ label.js và cập nhật schema
import { Schema, model, models } from "mongoose";

const messageTemplateSchema = new Schema(
  {
    // ++ ADDED: Thêm name để làm định danh duy nhất, không dấu, không khoảng trắng
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // ** MODIFIED: Đổi title thành `description` để mô tả mẫu tin
    description: { type: String, required: true, trim: true },
    // ** MODIFIED: Giữ lại content làm nội dung tin nhắn
    content: { type: String, default: "" },
    // ++ ADDED: Tham chiếu đến người tạo
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

const MessageTemplate =
  models.messagetemplate || model("messagetemplate", messageTemplateSchema);
export default MessageTemplate;
