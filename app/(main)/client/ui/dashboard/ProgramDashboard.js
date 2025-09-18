// [ADD] app/(main)/client/ui/dashboard/ProgramDashboard.js

"use client";

import React, { useState } from "react";
import styles from "./ProgramDashboard.module.css";

const Widget = ({ title, value, icon }) => (
  <div className={styles.widget}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.text}>
      <div className={styles.value}>{value}</div>
      <div className={styles.title}>{title}</div>
    </div>
  </div>
);

const CollapseIcon = ({ isCollapsed }) => (
  <svg
    className={styles.collapseIcon}
    style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function ProgramDashboard({ program, stats }) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Mặc định là ẩn

  const programName = program ? program.name : "Tổng quan";
  const isGeneral = !program;

  return (
    <div
      className={`${styles.container} ${isCollapsed ? styles.collapsed : ""}`}
    >
      <div
        className={styles.header}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h4>Bảng điều khiển: {programName}</h4>
        <CollapseIcon isCollapsed={isCollapsed} />
      </div>
      <div className={styles.widgetsGrid}>
        {isGeneral ? (
          <>
            <Widget
              title="Tổng số Chương trình"
              value={stats.totalPrograms || 0}
              icon="🗂️"
            />
            <Widget
              title="Tổng số Khách hàng"
              value={stats.totalCustomers || 0}
              icon="👥"
            />
            <Widget
              title="Chiến dịch đang chạy"
              value={stats.totalCampaigns || 0}
              icon="🚀"
            />
            <Widget
              title="Khách hàng/Chương trình"
              value={(stats.customersPerProgram || []).join(" | ") || "N/A"}
              icon="📊"
            />
          </>
        ) : (
          <>
            <Widget
              title="Tổng số Khách hàng"
              value={stats.totalCustomers || 0}
              icon="👥"
            />
            <Widget
              title="Theo Giai đoạn"
              value={stats.byStage || "N/A"}
              icon="📈"
            />
            <Widget
              title="Theo Trạng thái"
              value={stats.byStatus || "N/A"}
              icon="🔖"
            />
            <Widget
              title="Chưa có Trạng thái"
              value={stats.noStatus || 0}
              icon="❓"
            />
          </>
        )}
      </div>
    </div>
  );
}
