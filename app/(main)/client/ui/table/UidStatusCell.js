// [MOD] app/(main)/client/ui/table/UidStatusCell.js

import React, { useMemo } from "react";
import styles from "./UidStatusCell.module.css";

// [DEL] Xóa component Badge cũ

export default function UidStatusCell({ uidData = [], zaloAccounts = [] }) {
  // [MOD] Sử dụng useMemo để tính toán chỉ một lần
  const statusCounts = useMemo(() => {
    const counts = { found: 0, error: 0, pending: 0 };
    if (!zaloAccounts || zaloAccounts.length === 0) {
      return counts;
    }

    const uidMap = new Map(
      (uidData || []).map((u) => [u.zaloId.toString(), u.uid]),
    );

    zaloAccounts.forEach((acc) => {
      const uid = uidMap.get(acc._id.toString());
      if (uid === null || uid === undefined || uid === "") {
        counts.pending++;
      } else if (/^\d+$/.test(uid)) {
        counts.found++;
      } else {
        counts.error++;
      }
    });

    return counts;
  }, [uidData, zaloAccounts]);

  // [MOD] Render ra giao diện tóm tắt mới
  return (
    <div className={styles.summaryContainer}>
      <span className={styles.summaryItem} title="Đã có UID">
        ✅ {statusCounts.found}
      </span>
      <span className={styles.summaryItem} title="UID bị lỗi">
        ❌ {statusCounts.error}
      </span>
      <span className={styles.summaryItem} title="Chưa có UID">
        ➖ {statusCounts.pending}
      </span>
    </div>
  );
}
