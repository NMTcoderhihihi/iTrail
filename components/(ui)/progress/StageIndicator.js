// [MOD] components/(ui)/progress/StageIndicator.js

import React from "react";
import styles from "./StageIndicator.module.css";

/**
 * Component hiển thị tiến trình giai đoạn dưới dạng số (ví dụ: 2/4).
 * @param {object} props
 * @param {number} props.level - Cấp độ hiện tại (ví dụ: 1, 2, 3).
 * @param {number} props.totalStages - Tổng số giai đoạn.
 */
const StageIndicator = ({ level = 0, totalStages = 1 }) => {
  // Đảm bảo totalStages không bao giờ là 0 để tránh lỗi chia cho 0
  const total = Math.max(1, totalStages);

  return (
    <div
      className={styles.container}
      title={`Giai đoạn ${level} trên tổng số ${total} giai đoạn`}
    >
      <span className={styles.currentLevel}>{level}</span>
      <span className={styles.separator}>/</span>
      <span className={styles.totalStages}>{total}</span>
    </div>
  );
};

export default StageIndicator;
