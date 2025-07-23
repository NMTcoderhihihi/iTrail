// File: app/(main)/admin/components/AccountManagement.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "@/app/(main)/admin/admin.module.css";
import {
  getZaloAccounts,
  getAllUsers,
  toggleUserAccess,
} from "@/app/actions/zaloAccountActions";
import CenterPopup from "@/components/(features)/(popup)/popup_center";
import Loading from "@/components/(ui)/(loading)/loading";

// --- Component Popup Gán Quyền ---
const AssignUserPopup = ({ account, allUsers, onClose }) => {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (userId) => {
    startTransition(async () => {
      await toggleUserAccess(account._id, userId);
    });
  };

  // ================= START: SỬA LỖI PHỤ TRONG POPUP =================
  // Đảm bảo account.users luôn là mảng để tránh lỗi tương tự trong popup
  const assignedUserIds = new Set((account.users || []).map((u) => u._id));
  // =================  END: SỬA LỖI PHỤ TRONG POPUP  =================

  return (
    <div className={styles.popupForm}>
      <h3>Gán quyền cho tài khoản: {account.name}</h3>
      <div className={styles.userList}>
        {(allUsers || []).map((user) => (
          <div key={user._id} className={styles.userListItem}>
            <span>
              {user.name} ({user.email})
            </span>
            <button
              onClick={() => handleToggle(user._id)}
              className={
                assignedUserIds.has(user._id)
                  ? styles.deleteButton
                  : styles.addButton
              }
              disabled={isPending}
            >
              {isPending
                ? "..."
                : assignedUserIds.has(user._id)
                ? "Thu hồi"
                : "Gán quyền"}
            </button>
          </div>
        ))}
      </div>
      <div className={styles.formActions}>
        <button onClick={onClose} className={styles.cancelButton}>
          Đóng
        </button>
      </div>
    </div>
  );
};

// --- Component Chính ---
export default function AccountManagement() {
  const [accounts, setAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getZaloAccounts(), getAllUsers()]).then(
      ([accountData, userData]) => {
        setAccounts(accountData);
        setAllUsers(userData);
        setIsLoading(false);
      },
    );
  }, []);

  const handleOpenPopup = (account) => {
    setSelectedAccount(account);
    setIsPopupOpen(true);
  };

  if (isLoading) {
    return <Loading content="Đang tải danh sách tài khoản..." />;
  }

  return (
    <div className={styles.managementContainer}>
      <div className={styles.managementHeader}>
        <h2>Danh sách Tài khoản Zalo</h2>
      </div>
      <div className={styles.tableContainer}>
        <table>
          <thead>
            <tr>
              <th>Tên tài khoản</th>
              <th>Số điện thoại</th>
              <th>Nhân viên được gán</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account._id}>
                <td>{account.name}</td>
                <td>{account.phone}</td>
                <td>
                  {/* ================= START: SỬA LỖI CHÍNH ================= */}
                  {/*
                    Thêm `(account.users || [])` để kiểm tra.
                    Nếu `account.users` tồn tại và là một mảng, nó sẽ được sử dụng.
                    Nếu `account.users` là `null` hoặc `undefined`, một mảng rỗng `[]` sẽ được sử dụng thay thế.
                    Điều này giúp hàm `.map()` luôn chạy được mà không gây lỗi.
                  */}
                  {(account.users || []).map((u) => u.name).join(", ") ||
                    "Chưa gán"}
                  {/* =================  END: SỬA LỖI CHÍNH  ================= */}
                </td>
                <td>
                  <button
                    onClick={() => handleOpenPopup(account)}
                    className={styles.editButton}
                  >
                    Gán quyền
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPopupOpen && selectedAccount && (
        <CenterPopup open={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
          <AssignUserPopup
            account={selectedAccount}
            allUsers={allUsers}
            onClose={() => setIsPopupOpen(false)}
          />
        </CenterPopup>
      )}
    </div>
  );
}
