// scripts/find-skipped-actions.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT TÌM VÀ THỐNG KÊ CÁC HÀNH ĐỘNG BỊ BỎ QUA KHI DI TRÚ ===
// =================================================================

// Định nghĩa schema tối giản để đọc 2 collection cần thiết
const HistoryOldSchema = new Schema(
  {},
  { strict: false, collection: "actionhistories_old" },
);
const ActionTypeDefinitionSchema = new Schema(
  { actionType: String },
  { strict: false, collection: "actiontypedefinitions" },
);

const History_Old =
  mongoose.models.History_Old ||
  mongoose.model("History_Old", HistoryOldSchema);
const ActionTypeDefinition =
  mongoose.models.actionTypeDefinition ||
  mongoose.model("actionTypeDefinition", ActionTypeDefinitionSchema);

// Bản đồ ánh xạ tên hành động cũ sang tên mới, giống hệt trong script di trú
const ACTION_NAME_MAP = {
  UPDATE_NAME_CUSTOMER: "update_customer_core_info",
  UPDATE_STATUS_CUSTOMER: "update_customer_enrollment",
  UPDATE_STAGE_CUSTOMER: "update_customer_enrollment",
  ADD_COMMENT_CUSTOMER: "add_customer_comment",
  CREATE_SCHEDULE_SEND_MESSAGE: "create_schedule_send_message",
  CREATE_SCHEDULE_ADD_FRIEND: "create_schedule_add_friend",
  CREATE_SCHEDULE_FIND_UID: "create_schedule_find_uid",
  DELETE_SCHEDULE_SEND_MESSAGE: "delete_schedule_send_message",
  DELETE_SCHEDULE_FIND_UID: "delete_schedule_find_uid",
  DO_SCHEDULE_SEND_MESSAGE: "do_schedule_send_message",
  DO_SCHEDULE_ADD_FRIEND: "do_schedule_add_friend",
  DO_SCHEDULE_FIND_UID: "do_schedule_find_uid",
  AUTO_CANCEL_RATE_LIMIT: "auto_cancel_rate_limit",
  AUTO_CANCEL_ZALO_FAILURE: "auto_cancel_zalo_failure",
};

async function findSkippedActions() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    console.log("\n--- ⭐ Bắt đầu phân tích các hành động bị bỏ qua ---");

    // 1. Lấy tất cả các định nghĩa đã có
    const actionTypeDefs = await ActionTypeDefinition.find().lean();
    const definedActionTypes = new Set(
      actionTypeDefs.map((def) => def.actionType.toLowerCase()),
    );

    // 2. Lấy tất cả lịch sử cũ
    const oldHistories = await History_Old.find().lean();
    if (oldHistories.length === 0) {
      console.log("   -> ℹ️ Không có lịch sử cũ để phân tích.");
      return;
    }

    const skippedActions = {}; // Dùng object để đếm số lần xuất hiện

    // 3. Lặp qua và kiểm tra
    for (const oldLog of oldHistories) {
      const newActionName = ACTION_NAME_MAP[oldLog.action];

      // Nếu tên hành động cũ không có trong bản đồ ánh xạ, hoặc
      // tên mới sau khi ánh xạ không có trong danh sách đã định nghĩa
      if (!newActionName || !definedActionTypes.has(newActionName)) {
        // Tăng bộ đếm cho loại hành động bị thiếu này
        if (!skippedActions[oldLog.action]) {
          skippedActions[oldLog.action] = 0;
        }
        skippedActions[oldLog.action]++;
      }
    }

    // 4. In kết quả
    const skippedActionNames = Object.keys(skippedActions);

    if (skippedActionNames.length > 0) {
      console.log(
        `   -> ⚠️  Phát hiện ${skippedActionNames.length} loại hành động không có định nghĩa:`,
      );
      for (const actionName of skippedActionNames) {
        console.log(
          `       - Tên hành động: "${actionName}", Số lượng: ${skippedActions[actionName]} bản ghi`,
        );
      }
      console.log(
        "\n   -> Vui lòng bổ sung các 'actionType' này vào mảng `actionTypes` trong file `scripts/migrate-db.js`.",
      );
    } else {
      console.log(
        "   -> ✅ Tuyệt vời! Tất cả các hành động trong lịch sử cũ đều đã được định nghĩa.",
      );
    }
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi trong quá trình thực thi:", error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB. Quá trình kết thúc.");
    }
  }
}

// findSkippedActions();
