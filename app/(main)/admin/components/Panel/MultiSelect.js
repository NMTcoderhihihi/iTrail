// [ADD] app/(main)/admin/components/Panel/MultiSelect.js
"use client";

import React from "react";
// [NOTE] Component này sẽ sử dụng lại style từ file CSS của panel cha
import styles from "./FieldDefinitionEditorPanel.module.css";

/**
 * Component chọn nhiều mục từ danh sách.
 * @param {object} props
 * @param {string} props.label - Tiêu đề của khu vực chọn.
 * @param {Array<{id: string, name: string}>} props.options - Danh sách các lựa chọn.
 * @param {Array<string>} props.selectedIds - Mảng các ID đã được chọn.
 * @param {Function} props.onChange - Hàm callback được gọi khi lựa chọn thay đổi.
 */
export default function MultiSelect({
  label,
  options = [],
  selectedIds = [],
  onChange,
}) {
  const handleToggle = (optionId) => {
    const newSelectedIds = [...selectedIds];
    const index = newSelectedIds.indexOf(optionId);

    if (index > -1) {
      newSelectedIds.splice(index, 1); // Bỏ chọn
    } else {
      newSelectedIds.push(optionId); // Chọn
    }
    onChange(newSelectedIds);
  };

  return (
    <div className={styles.multiSelectContainer}>
      <div className={styles.multiSelectHeader}>
        {label} ({selectedIds.length})
      </div>
      <div className={styles.multiSelectList}>
        {options.map((option) => (
          <label key={option.id} className={styles.multiSelectItem}>
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => handleToggle(option.id)}
            />
            <span>{option.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
