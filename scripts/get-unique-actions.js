// scripts/get-unique-actions.js
import { Schema, mongoose } from "mongoose";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config({ path: ".env" });

// =================================================================
// === SCRIPT PHÂN TÍCH VÀ TRÍCH XUẤT CÁC HÀNH ĐỘNG DUY NHẤT ===
// =================================================================

// Định nghĩa một schema tối giản để Mongoose có thể đọc collection.
// collection: 'actionhistories_old' -> Trỏ đến collection đã được đổi tên.
const HistoryOldSchema = new Schema(
  {},
  { strict: false, collection: "actionhistories" },
);
const History_Old =
  mongoose.models.History_Old ||
  mongoose.model("History_Old", HistoryOldSchema);

async function getUniqueActions() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ Lỗi: Biến môi trường 'MONGODB_URI' chưa được thiết lập.");
    return;
  }

  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Kết nối thành công!");

    console.log(
      "\n--- ⭐ Bắt đầu truy vấn các hành động duy nhất từ 'actionhistories_old' ---",
    );

    // Pipeline để gom nhóm theo 'action' và lấy ra document mẫu đầu tiên
    const pipeline = [
      {
        $group: {
          _id: "$action",
          sampleDocument: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$sampleDocument",
        },
      },
      {
        // Sắp xếp kết quả theo tên action cho dễ đọc
        $sort: {
          action: 1,
        },
      },
    ];

    const uniqueActions = await History_Old.aggregate(pipeline);

    if (uniqueActions.length > 0) {
      console.log(
        `   -> ✅ Tìm thấy ${uniqueActions.length} loại hành động duy nhất.`,
      );
      const outputPath = path.resolve(process.cwd(), "unique_actions.json");

      // Ghi kết quả ra file JSON
      // `null, 2` để format file JSON cho đẹp và dễ đọc
      await fs.writeFile(
        outputPath,
        JSON.stringify(uniqueActions, null, 2),
        "utf-8",
      );
      console.log(`   -> ✅ Đã xuất kết quả ra file: ${outputPath}`);
    } else {
      console.log(
        "   -> ⚠️ Không tìm thấy bản ghi lịch sử nào trong 'actionhistories_old'.",
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

getUniqueActions();
