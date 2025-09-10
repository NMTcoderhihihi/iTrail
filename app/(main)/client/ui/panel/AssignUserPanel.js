// [ADD] File mới: app/(main)/client/ui/panel/AssignUserPanel.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "./CustomerDetails.module.css"; // Tái sử dụng style
import Loading from "@/components/(ui)/(loading)/loading";
import { getUsersForFilter } from "@/app/data/user/user.queries";
import { assignUsersToCustomers } from "@/app/data/customer/customer.actions";
import { usePanels } from "@/contexts/PanelContext";

// [MOD] Thay đổi cách nhận props từ { panelData } thành { customerIds, onAssignSuccess }
export default function AssignUserPanel({ customerIds, onAssignSuccess }) {
  const { closePanel } = usePanels();

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUsersForFilter().then((users) => {
      setAllUsers(users);
      setIsLoading(false);
    });
  }, []);

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAssign = () => {
    if (selectedUserIds.size === 0) {
      alert("Vui lòng chọn ít nhất một nhân viên.");
      return;
    }
    startTransition(async () => {
      const result = await assignUsersToCustomers({
        customerIds,
        userIds: Array.from(selectedUserIds),
      });
      if (result.success) {
        alert(`Gán thành công cho ${result.modifiedCount} khách hàng!`);
        onAssignSuccess();
        closePanel(); // Tự đóng panel sau khi thành công
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  return (
    <div className={styles.tagEditorContainer}>
      {isLoading ? (
        <Loading />
      ) : (
        <div className={styles.tagList}>
          {(allUsers || []).map((user) => (
            <label key={user._id} className={styles.tagEditorItem}>
              <input
                type="checkbox"
                checked={selectedUserIds.has(user._id)}
                onChange={() => handleToggleUser(user._id)}
              />
              <span>
                {user.name} ({user.email})
              </span>
            </label>
          ))}
        </div>
      )}
      <div className={styles.tagEditorActions}>
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
          disabled={isPending || selectedUserIds.size === 0}
        >
          {isPending ? "Đang gán..." : `Gán (${selectedUserIds.size})`}
        </button>
      </div>
    </div>
  );
}
