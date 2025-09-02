// scripts/get-stats.js
import mongoose from "mongoose";
import dotenv from "dotenv";

// Tải biến môi trường
dotenv.config({ path: ".env" });

const { Schema, model, models } = mongoose;

// --- Định nghĩa Schema tối giản ---
const ActionHistorySchema = new Schema(
  {
    action: String,
    customer: { type: Schema.Types.ObjectId, ref: "customer" },
    zalo: { type: Schema.Types.ObjectId, ref: "zaloaccount" },
    status: {
      status: String,
    },
    actionDetail: {
      scheduleId: Schema.Types.ObjectId,
    },
  },
  { strict: false },
);

const ZaloAccountSchema = new Schema(
  {
    name: String,
    phone: String,
  },
  { strict: false },
);

// ++ ADDED: Schema tối giản cho Customer để đếm UID
const CustomerSchema = new Schema(
  {
    uid: [
      {
        uid: String,
      },
    ],
  },
  { strict: false },
);

// --- Khởi tạo Models ---
const ActionHistory =
  models.actionhistory || model("actionhistory", ActionHistorySchema);
const ZaloAccount =
  models.zaloaccount || model("zaloaccount", ZaloAccountSchema);
const Customer = models.customer || model("customer", CustomerSchema);

// --- Hàm kết nối DB ---
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  if (mongoose.connections[0].readyState) {
    isConnected = true;
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
  } catch (error) {
    throw new Error("Lỗi kết nối MongoDB: " + error);
  }
};

// --- Chú thích rút gọn ---
const ACTION_SUMMARY = {
  USER_LOGIN: "Đăng nhập hệ thống",
  CREATE_SCHEDULE_SEND_MESSAGE: "Lên lịch chiến dịch gửi tin",
  DELETE_SCHEDULE_SEND_MESSAGE: "Xóa K.H khỏi lịch gửi tin",
  DO_SCHEDULE_SEND_MESSAGE: "Thực thi gửi tin nhắn tự động",
  CREATE_SCHEDULE_ADD_FRIEND: "Lên lịch chiến dịch kết bạn",
  DO_SCHEDULE_ADD_FRIEND: "Thực thi kết bạn tự động",
  CREATE_SCHEDULE_FIND_UID: "Lên lịch chiến dịch tìm UID",
  DO_SCHEDULE_FIND_UID: "Thực thi tìm UID tự động",
  UPDATE_NAME_CUSTOMER: "Cập nhật tên khách hàng",
  UPDATE_STATUS_CUSTOMER: "Cập nhật trạng thái K.H",
  UPDATE_STAGE_CUSTOMER: "Thay đổi giai đoạn K.H",
  ADD_COMMENT_CUSTOMER: "Thêm ghi chú/bình luận",
  AUTO_CANCEL_RATE_LIMIT: "Tác vụ bị hủy (đạt giới hạn)",
  AUTO_CANCEL_ZALO_FAILURE: "Tác vụ bị hủy (lỗi tài khoản)",
};

// --- Logic chính của Script ---
async function runStatistics() {
  console.log("🚀 Bắt đầu script thống kê (phiên bản hoàn chỉnh)...");

  try {
    await connectDB();
    console.log("🍃 Kết nối MongoDB thành công.");

    console.log(
      "\n📊 Đang thống kê từ collection 'actionhistory' và 'customers'...",
    );

    // Thống kê chiến dịch từ ActionHistory
    const campaignStats = await ActionHistory.aggregate([
      {
        $match: {
          action: {
            $in: [
              "DO_SCHEDULE_SEND_MESSAGE",
              "DO_SCHEDULE_ADD_FRIEND",
              "DO_SCHEDULE_FIND_UID",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$action",
          totalSuccess: {
            $sum: { $cond: [{ $eq: ["$status.status", "SUCCESS"] }, 1, 0] },
          },
          uniqueCampaigns: { $addToSet: "$actionDetail.scheduleId" },
        },
      },
    ]);

    const allCampaignIds = new Set();
    let totalMessagesSent = 0;
    let totalFriendsAdded = 0;
    let totalUidsFoundActions = 0; // Đổi tên để phân biệt với số khách hàng có UID

    campaignStats.forEach((stat) => {
      stat.uniqueCampaigns.forEach((id) => allCampaignIds.add(id?.toString()));
      if (stat._id === "DO_SCHEDULE_SEND_MESSAGE")
        totalMessagesSent = stat.totalSuccess;
      if (stat._id === "DO_SCHEDULE_ADD_FRIEND")
        totalFriendsAdded = stat.totalSuccess;
      if (stat._id === "DO_SCHEDULE_FIND_UID")
        totalUidsFoundActions = stat.totalSuccess;
    });

    const totalCampaigns = allCampaignIds.size;

    // Đếm số khách hàng duy nhất đã nhận tin
    const uniqueCustomersWithMessageResult = await ActionHistory.aggregate([
      {
        $match: {
          action: "DO_SCHEDULE_SEND_MESSAGE",
          "status.status": "SUCCESS",
          customer: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$customer" } },
      { $count: "uniqueCount" },
    ]);
    const uniqueCustomersWithMessage =
      uniqueCustomersWithMessageResult[0]?.uniqueCount || 0;
    const avgMessagesPerCustomer =
      uniqueCustomersWithMessage > 0
        ? (totalMessagesSent / uniqueCustomersWithMessage).toFixed(2)
        : 0;

    // ** ++ ADDED: Logic mới - Đếm số khách hàng có UID hợp lệ **
    const customersWithUidResult = await Customer.aggregate([
      // Bước 1: Lọc ra những khách hàng có ít nhất một UID hợp lệ
      {
        $match: {
          "uid.uid": { $regex: /^\d+$/ }, // Tìm bất kỳ phần tử nào trong mảng `uid` có trường `uid` là chuỗi số
        },
      },
      // Bước 2: Đếm số lượng khách hàng tìm được
      {
        $count: "total",
      },
    ]);
    const totalCustomersWithUid = customersWithUidResult[0]?.total || 0;

    // Thống kê chi tiết theo từng tài khoản Zalo
    const statsByZalo = await ActionHistory.aggregate([
      {
        $match: {
          action: {
            $in: [
              "DO_SCHEDULE_SEND_MESSAGE",
              "DO_SCHEDULE_ADD_FRIEND",
              "DO_SCHEDULE_FIND_UID",
            ],
          },
          zalo: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$zalo",
          messagesSent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$action", "DO_SCHEDULE_SEND_MESSAGE"] },
                    { $eq: ["$status.status", "SUCCESS"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          friendsAdded: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$action", "DO_SCHEDULE_ADD_FRIEND"] },
                    { $eq: ["$status.status", "SUCCESS"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          uidsFound: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$action", "DO_SCHEDULE_FIND_UID"] },
                    { $eq: ["$status.status", "SUCCESS"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "zaloaccounts",
          localField: "_id",
          foreignField: "_id",
          as: "zaloInfo",
        },
      },
      { $unwind: "$zaloInfo" },
      { $sort: { messagesSent: -1 } },
    ]);
    const totalZaloAccountsUsed = statsByZalo.length;

    // Thống kê chi tiết các hành động
    console.log("📜 Đang thống kê chi tiết các loại hành động...");
    const actionStats = await ActionHistory.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // === Hiển thị kết quả ===
    console.log("\n\n--- 📈 KẾT QUẢ THỐNG KÊ TỔNG QUAN 📈 ---\n");

    console.log(
      "✨ Tổng quan về Chiến dịch (Nguồn: ActionHistory & Customers):",
    );
    console.log(`   - Tổng số chiến dịch đã chạy: ${totalCampaigns}`);
    console.log(
      `   - Tổng số tài khoản Zalo đã sử dụng: ${totalZaloAccountsUsed}`,
    );
    console.log(
      `   - Tổng số tin nhắn đã gửi thành công: ${totalMessagesSent}`,
    );
    console.log(
      `   - Số khách hàng đã nhận tin (duy nhất): ${uniqueCustomersWithMessage}`,
    );
    console.log(
      `   - Tỉ lệ gửi tin trung bình/khách hàng: ${avgMessagesPerCustomer} tin`,
    );
    console.log(`   - Tổng số lời mời kết bạn đã gửi: ${totalFriendsAdded}`);
    console.log(
      `   - Tổng số LẦN tìm UID thành công: ${totalUidsFoundActions}`,
    );
    console.log(`   - Tổng số KHÁCH HÀNG đã có UID: ${totalCustomersWithUid}`);

    console.log("\n----------------------------------------\n");
    console.log("✨ Thống kê hiệu suất theo từng Tài khoản Zalo:");
    if (statsByZalo.length > 0) {
      statsByZalo.forEach((stat) => {
        console.log(`   - ${stat.zaloInfo.name} (${stat.zaloInfo.phone}):`);
        console.log(`     - Tin nhắn đã gửi: ${stat.messagesSent}`);
        console.log(`     - Kết bạn đã gửi: ${stat.friendsAdded}`);
        console.log(`     - UID đã tìm: ${stat.uidsFound}`);
      });
    } else {
      console.log("   - Chưa có dữ liệu thực thi từ tài khoản Zalo nào.");
    }

    console.log("\n----------------------------------------\n");

    console.log("✨ Thống kê chi tiết các loại hành động:");
    if (actionStats.length > 0) {
      actionStats.forEach((stat) => {
        const summary = ACTION_SUMMARY[stat._id] || stat._id;
        console.log(`   - ${summary}: ${stat.count} lần`);
      });
    } else {
      console.log("   - Không có dữ liệu lịch sử hành động.");
    }

    console.log("\n🎉 Script đã thực thi thành công!");
  } catch (error) {
    console.error("\n❌ Đã xảy ra lỗi:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Đã ngắt kết nối khỏi MongoDB.");
  }
}

// Chạy script
runStatistics();
