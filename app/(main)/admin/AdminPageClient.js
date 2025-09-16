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
// [ADD] Import component mới
import CareProgramManagement from "./components/CareProgramManagement";
// [ADD] Import component mới
import DataSourceManagement from "./components/DataSourceManagement";
import FieldDefinitionManagement from "./components/FieldDefinitionManagement";
import { useSearchParams } from "next/navigation";
import TagManagement from "./components/TagManagement";
import ReportDashboard from "./components/ReportDashboard"; // [ADD] Import component mới

export default function AdminPageClient() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "reports-overview"; // [MOD] Mặc định là tab báo cáo

  const renderActiveComponent = () => {
    // ... (logic switch/case không thay đổi)
    switch (activeTab) {
      // [ADD] Thêm case mới cho báo cáo
      case "reports-overview":
      case "reports-employee":
        return <ReportDashboard />;
      case "tags":
        return <TagManagement />;
      case "fields":
        return <FieldDefinitionManagement />;
      case "datasources":
        return <DataSourceManagement />;
      case "programs":
        return <CareProgramManagement />;
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
        return <ReportDashboard />; // [MOD] Mặc định là tab báo cáo
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
