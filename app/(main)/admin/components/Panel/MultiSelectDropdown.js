// [ADD] app/(main)/admin/components/Panel/MultiSelectDropdown.js
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import styles from "./MultiSelectDropdown.module.css";
import { Svg_Close } from "@/components/(icon)/svg";

export default function MultiSelectDropdown({
  label,
  options = [],
  selectedIds = [],
  onChange,
  displayAs = "chip", // Thêm prop mới: 'chip' hoặc 'list'
}) {
  const [isAdding, setIsAdding] = useState(false);

  const selectedOptions = useMemo(() => {
    const selectedMap = new Map(options.map((opt) => [opt.id, opt.name]));
    return selectedIds.map((id) => ({ id, name: selectedMap.get(id) || id }));
  }, [options, selectedIds]);

  const availableOptions = useMemo(
    () => options.filter((opt) => !selectedIds.includes(opt.id)),
    [options, selectedIds],
  );

  const handleSelect = (optionId) => {
    onChange([...selectedIds, optionId]);
    setIsAdding(false);
  };

  const handleDeselect = (optionId) => {
    onChange(selectedIds.filter((id) => id !== optionId));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>
          {label} ({selectedIds.length})
        </span>
        <button
          className={styles.addButton}
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? "Đóng" : "+ Thêm"}
        </button>
      </div>
      <div className={styles.body}>
        {displayAs === "chip" && (
          <div className={styles.chipContainer}>
            {selectedOptions.map((opt) => (
              <div key={opt.id} className={styles.chip}>
                <span>{opt.name}</span>
                <button
                  onClick={() => handleDeselect(opt.id)}
                  className={styles.removeChipBtn}
                >
                  <Svg_Close w={12} h={12} c="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}

        {displayAs === "list" && (
          <div className={styles.listContainer}>
            {selectedOptions.map((opt, index) => (
              <div key={opt.id} className={styles.listItem}>
                <span>
                  {index + 1}. {opt.name}
                </span>
                <button
                  onClick={() => handleDeselect(opt.id)}
                  className={styles.removeChipBtn}
                >
                  <Svg_Close w={14} h={14} c="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className={styles.dropdown}>
            {availableOptions.length > 0 ? (
              availableOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={styles.dropdownItem}
                  onClick={() => handleSelect(opt.id)}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div className={styles.noItemsText}>Đã chọn hết</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
