// [MOD] app/(main)/admin/AdminPageClient.js

"use client";

import React from "react";
import styles from "./admin.module.css";
// ... (các import component không đổi)
import CampaignLabels from "./components/CampaignLabels";
import CampaignTable from "./components/CampaignTable";
import AccountManagement from "./components/Account/AccountManagement";
import AssignFromSheet from "./components/AssignFromSheet";
import VariantManagement from "./components/VariantManagement";
import StatusManagement from "./components/StatusManagement";
import UserManagement from "./components/UserManagement";
// [MOD] Bỏ useRouter, usePathname vì Nav đã xử lý
import { useSearchParams } from "next/navigation";

export default function AdminPageClient() {
  const searchParams = useSearchParams();
  // [MOD] activeTab giờ chỉ đọc từ URL, không cần logic set state phức tạp
  const activeTab = searchParams.get("tab") || "running";

  // [DEL] Toàn bộ mảng menuItems và hàm handleTabChange đã được xóa
  // [NOTE] Việc render menu giờ đã được chuyển sang Nav.js

  const renderActiveComponent = () => {
    // ... (logic switch/case không thay đổi)
    switch (activeTab) {
      case "labels":
        return <CampaignLabels />;
      case "variants":
        return <VariantManagement />;
      case "statuses":
        return <StatusManagement />;
      case "running":
        return <CampaignTable mode="running" />;
      case "archived":
        return <CampaignTable mode="archived" />;
      case "accounts":
        return <AccountManagement />;
      case "users":
        return <UserManagement />;
      case "assign":
        return <AssignFromSheet />;
      default:
        return <CampaignTable mode="running" />;
    }
  };

  return (
    // [MOD] Cấu trúc container được đơn giản hóa, không còn header và tab menu
    <div className={styles.adminContainer}>
      {/* [DEL] Thẻ <nav> đã bị xóa */}
      <main className={styles.adminContent}>{renderActiveComponent()}</main>
    </div>
  );
}
