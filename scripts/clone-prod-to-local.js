// scripts/clone-prod-to-local.js
import { execSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { URL } from "url";
import mongoose from "mongoose";

// =================================================================
// === NODE.JS SCRIPT SAO CHÉP DATABASE (v3 - XÓA SẠCH DB LOCAL) ===
// =================================================================

// --- Hàm tiện ích để in màu cho console ---
const color = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

// --- Logic chính ---
async function runClone() {
  console.log(
    color.green(
      "🚀 Bắt đầu quá trình sao chép dữ liệu từ Production về Local...",
    ),
  );

  // 1. Nạp biến môi trường một cách an toàn
  const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
  if (!fs.existsSync(envPath)) {
    console.log(color.red(`❌ Lỗi: Không tìm thấy file ${envPath}.`));
    process.exit(1);
  }
  dotenv.config({ path: envPath });

  // 2. Kiểm tra biến môi trường
  const { MONGODB_URI_PROD, MONGODB_URI } = process.env;
  if (!MONGODB_URI_PROD || !MONGODB_URI) {
    console.log(
      color.red(
        "❌ Lỗi: Vui lòng định nghĩa MONGODB_URI_PROD (production) và MONGODB_URI (local) trong file .env.",
      ),
    );
    process.exit(1);
  }

  // 3. Định nghĩa thư mục sao lưu
  const DUMP_DIR = "dump_prod";
  const dumpPath = path.resolve(process.cwd(), DUMP_DIR);

  // ** MODIFIED: Tự động trích xuất tên DB từ URI production
  let prodDbName;
  try {
    const parsedUrl = new URL(MONGODB_URI_PROD);
    prodDbName = parsedUrl.pathname.slice(1);
    if (!prodDbName) {
      throw new Error("Không tìm thấy tên database trong MONGODB_URI_PROD.");
    }
  } catch (e) {
    console.log(color.red(`❌ Lỗi: URI production không hợp lệ. ${e.message}`));
    process.exit(1);
  }

  const restoreSourcePath = path.join(DUMP_DIR, prodDbName);

  let localConnection;
  try {
    // 4. Chạy MONGODUMP
    console.log(
      color.yellow("\n--- Bước 1/3: Đang sao lưu (dump) từ Production ---"),
    );
    console.log(`Nguồn: ${MONGODB_URI_PROD}`);
    console.log(`Thư mục đích: ${dumpPath}`);
    execSync(
      `mongodump --uri="${MONGODB_URI_PROD}" --out="${DUMP_DIR}" --forceTableScan`,
      { stdio: "inherit" },
    );
    console.log(color.green("✅ Sao lưu từ Production thành công!"));

    // 5. ++ ADDED: Xóa sạch Database Local
    console.log(
      color.yellow("\n--- Bước 2/3: Đang xóa sạch (drop) database Local ---"),
    );
    console.log(`Kết nối tới Local DB để thực hiện xóa...`);
    localConnection = await mongoose.createConnection(MONGODB_URI).asPromise();
    await localConnection.dropDatabase();
    console.log(
      color.green(`✅ Đã xóa thành công database: "${localConnection.name}"`),
    );
    await localConnection.close();

    // 6. Chạy MONGORESTORE
    console.log(
      color.yellow("\n--- Bước 3/3: Đang phục hồi (restore) vào Local ---"),
    );
    console.log(`Nguồn phục hồi: ${restoreSourcePath}`);
    execSync(`mongorestore --uri="${MONGODB_URI}" "${restoreSourcePath}"`, {
      stdio: "inherit",
    });
    console.log(color.green("✅ Phục hồi vào Local thành công!"));
  } catch (error) {
    console.error(
      color.red("\n❌ Đã xảy ra lỗi trong quá trình thực thi:"),
      error.message,
    );
    if (localConnection) await localConnection.close(); // Đảm bảo đóng kết nối nếu có lỗi
    process.exit(1);
  } finally {
    // 6. Dọn dẹp
    console.log(color.yellow("\n--- Dọn dẹp ---"));
    if (fs.existsSync(dumpPath)) {
      fs.rmSync(dumpPath, { recursive: true, force: true });
      console.log(`🗑️  Đã xóa thư mục tạm '${DUMP_DIR}'.`);
    }
  }

  console.log(
    color.green(
      color.bold(
        "\n🎉 HOÀN TẤT! Dữ liệu từ Production đã được sao chép và đồng bộ hoàn toàn vào Local.",
      ),
    ),
  );
}

// Chạy hàm chính
//!!!!!!! Chỉ chạy khi muốn sync hoàn toàn db từ production về local !!!!!!
runClone();
