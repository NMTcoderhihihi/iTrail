// [MOD] app/(main)/client/ui/panel/AssignTagPanel.js
"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import styles from "./AssignPanel.module.css"; // [MOD] Sử dụng file CSS chung
import Loading from "@/components/(ui)/(loading)/loading";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { addTagsToCustomers } from "@/app/data/customer/customer.actions";
import { usePanels } from "@/contexts/PanelContext";

export default function AssignTagPanel({ customerIds, onAssignSuccess }) {
  const { closePanel } = usePanels();

  const [allTags, setAllTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState(""); // [ADD] State cho tìm kiếm
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getTagsForFilter().then((tags) => {
      setAllTags(tags);
      setIsLoading(false);
    });
  }, []);

  // [ADD] Logic để lọc danh sách tag
  const filteredTags = useMemo(() => {
    if (!searchTerm) {
      return allTags;
    }
    return allTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allTags, searchTerm]);

  const handleToggleTag = (tagId) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const handleAssign = () => {
    if (selectedTagIds.size === 0) {
      alert("Vui lòng chọn ít nhất một tag.");
      return;
    }
    startTransition(async () => {
      const result = await addTagsToCustomers({
        customerIds,
        tagIds: Array.from(selectedTagIds),
      });
      if (result.success) {
        alert(`Gán tag thành công cho ${result.modifiedCount} khách hàng!`);
        onAssignSuccess();
        closePanel();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    // [MOD] Tái cấu trúc toàn bộ giao diện
    <div className={styles.panelContainer}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Tìm kiếm theo tên tag..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <p className={styles.stats}>
          Đã chọn: {selectedTagIds.size} / {allTags.length}
        </p>
      </div>
      <div className={styles.listContainer}>
        {filteredTags.map((tag) => {
          const isSelected = selectedTagIds.has(tag._id);
          return (
            <div
              key={tag._id}
              className={`${styles.listItem} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() => handleToggleTag(tag._id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className={styles.checkbox}
              />
              <div className={styles.listItemContent}>
                <span>{tag.name}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.actions}>
        <button
          onClick={closePanel}
          className={`${styles.buttonBase} ${styles.ghostButton}`}
          disabled={isPending}
        >
          Hủy
        </button>
        <button
          onClick={handleAssign}
          className={`${styles.buttonBase} ${styles.blueButton}`}
          disabled={isPending || selectedTagIds.size === 0}
        >
          {isPending ? "Đang gán..." : `Gán (${selectedTagIds.size})`}
        </button>
      </div>
    </div>
  );
}
