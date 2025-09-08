// [ADD] app/(main)/client/ui/filters/UidZaloFilter.js

"use client";

import React from "react";
import styles from "./UidZaloFilter.module.css";

export default function UidZaloFilter({
  zaloAccounts,
  selectedZaloId,
  selectedUidStatus,
  onZaloChange,
  onStatusChange,
}) {
  const uidStatuses = [
    { key: "all", label: "Tất cả trạng thái" },
    { key: "found", label: "✅ Có UID" },
    { key: "error", label: "❌ Lỗi" },
    { key: "pending", label: "➖ Không có" },
  ];

  return (
    <div className={styles.container}>
      {/* Dropdown chọn tài khoản Zalo */}
      <select
        className={styles.select}
        value={selectedZaloId}
        onChange={(e) => onZaloChange(e.target.value)}
      >
        <option value="all">-- Tất cả tài khoản Zalo --</option>
        {zaloAccounts.map((account) => (
          <option key={account._id} value={account._id}>
            {account.name} ({account.phone})
          </option>
        ))}
      </select>

      {/* Dropdown chọn trạng thái UID */}
      <select
        className={styles.select}
        value={selectedUidStatus}
        onChange={(e) => onStatusChange(e.target.value)}
        // Vô hiệu hóa khi chưa chọn tài khoản Zalo cụ thể
        disabled={!selectedZaloId || selectedZaloId === "all"}
      >
        {uidStatuses.map((status) => (
          <option key={status.key} value={status.key}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
