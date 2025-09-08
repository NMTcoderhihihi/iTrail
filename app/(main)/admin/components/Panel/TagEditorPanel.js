// [ADD] app/(main)/admin/components/Panel/TagEditorPanel.js
"use client";

import React, { useState, useTransition } from "react";
import styles from "./LabelEditorPanel.module.css"; // Reuse styles
import { createOrUpdateTag } from "@/app/data/tag/tag.action";

export default function TagEditorPanel({ initialData, onSaveSuccess }) {
  const [tag, setTag] = useState(initialData || { name: "", detail: "" });
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTag((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!tag.name) {
      alert("Tên Tag là bắt buộc.");
      return;
    }
    startTransition(async () => {
      const result = await createOrUpdateTag({ id: tag._id, ...tag });
      if (result.success) {
        onSaveSuccess();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className={styles.panelBody}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Tên Tag</label>
        <input
          id="name"
          name="name"
          type="text"
          value={tag.name}
          onChange={handleChange}
          className={styles.input}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="detail">Mô tả</label>
        <textarea
          id="detail"
          name="detail"
          value={tag.detail}
          onChange={handleChange}
          className={styles.textarea}
          rows={5}
        />
      </div>
      <div className={styles.panelFooter}>
        <button
          type="submit"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Đang lưu..." : "Lưu Tag"}
        </button>
      </div>
    </form>
  );
}
