// [ADD] app/(main)/admin/components/Panel/ReportLayoutEditorPanel.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "./LabelEditorPanel.module.css"; // Tái sử dụng style
// [FIX] Tách import: queries và actions ra 2 dòng riêng biệt
import { getReportLayoutById } from "@/app/data/report/report.queries";
import { createOrUpdateReportLayout } from "@/app/data/report/report.actions";
import LoadingSpinner from "../shared/LoadingSpinner";

export default function ReportLayoutEditorPanel({ layoutId, onSaveSuccess }) {
  const [layout, setLayout] = useState({ layoutName: "", description: "" });
  const [isLoading, setIsLoading] = useState(!!layoutId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (layoutId) {
      getReportLayoutById(layoutId).then((result) => {
        if (result.success) setLayout(result.data);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [layoutId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLayout((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await createOrUpdateReportLayout({
        id: layoutId,
        ...layout,
      });
      if (result.success) {
        onSaveSuccess();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.panelBody}>
      <div className={styles.formGroup}>
        <label>Tên Layout</label>
        <input
          name="layoutName"
          value={layout.layoutName}
          onChange={handleInputChange}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Mô tả</label>
        <textarea
          name="description"
          value={layout.description}
          onChange={handleInputChange}
          rows={4}
        ></textarea>
      </div>
      <div className={styles.panelFooter}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Đang lưu..." : "Lưu Layout"}
        </button>
      </div>
    </div>
  );
}
