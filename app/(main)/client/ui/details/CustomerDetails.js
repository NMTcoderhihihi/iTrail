// [MOD] app/(main)/client/ui/details/CustomerDetails.js

"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./CustomerDetails.module.css";
// [ADD] Import action để lấy dữ liệu chi tiết
import { getCustomerDetails } from "@/app/data/customer/customer.actions";
import { usePanels } from "@/contexts/PanelContext";
import {
  Svg_History,
  Svg_Notes,
  Svg_Edit,
  Svg_Pen,
  Svg_Send,
} from "@/components/(icon)/svg";
import Loading from "@/components/(ui)/(loading)/loading";
import StageIndicator from "@/components/(ui)/progress/StageIndicator";
import CustomerHistoryPanel from "./CustomerHistoryPanel";
import CenterPopup from "@/components/(features)/(popup)/popup_center";

// ================================================================================
// --- HELPER COMPONENTS (Thành phần phụ trợ) ---
// ================================================================================

// [ADD] Component đa dụng cho các section có thể thu gọn/mở rộng
const CollapsibleSection = ({ title, initialCollapsed = false, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const Icon = () => (
    <svg
      className={`${styles.chevronIcon} ${isCollapsed ? styles.collapsed : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  return (
    <div className={styles.section}>
      <div
        className={styles.sectionHeader}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3 className={styles.sectionTitle}>{title}</h3>
        <Icon />
      </div>
      {!isCollapsed && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
};

// [MOD] InfoRow được giữ lại và đơn giản hóa
const InfoRow = ({ label, children }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <div className={styles.infoValue}>{children}</div>
  </div>
);

// [ADD] Component mới cho một trường dữ liệu động
const DynamicField = ({ field, onValueChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(field.value);

  const handleSave = () => {
    onValueChange(field.id, value);
    setIsEditing(false);
  };

  return (
    <div className={styles.infoRow}>
      <span className={styles.fieldLabel} title={`Nguồn: ${field.dataSource}`}>
        {field.label}
      </span>
      <div className={styles.infoValue}>
        {isEditing ? (
          <div className={styles.editInputContainer}>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={styles.inlineInput}
              autoFocus
            />
            <button onClick={handleSave} className={styles.inlineSaveButton}>
              Lưu
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={styles.inlineCancelButton}
            >
              Hủy
            </button>
          </div>
        ) : (
          <span
            className={styles.fieldValue}
            onClick={() => setIsEditing(true)}
          >
            {field.value}
          </span>
        )}
      </div>
    </div>
  );
};

// [ADD] Component mới cho popup chỉnh sửa Tag
const TagEditor = ({ allTags, customerTags, onSave, onClose }) => {
  const [selectedTagIds, setSelectedTagIds] = useState(
    () => new Set(customerTags.map((t) => t._id)),
  );

  const handleToggle = (tagId) => {
    const newSet = new Set(selectedTagIds);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    setSelectedTagIds(newSet);
  };

  return (
    <CenterPopup open={true} onClose={onClose} title="Chỉnh sửa Tags" size="md">
      <div className={styles.tagEditorContainer}>
        <input
          type="search"
          placeholder="Tìm kiếm tag..."
          className={styles.tagSearchInput}
        />
        <div className={styles.tagList}>
          {allTags.map((tag) => (
            <label key={tag._id} className={styles.tagEditorItem}>
              <input
                type="checkbox"
                checked={selectedTagIds.has(tag._id)}
                onChange={() => handleToggle(tag._id)}
              />
              <span>{tag.name}</span>
            </label>
          ))}
        </div>
        <div className={styles.tagEditorActions}>
          <button
            onClick={onClose}
            className={`${styles.buttonBase} ${styles.ghostButton}`}
          >
            Hủy
          </button>
          <button
            onClick={() => onSave(selectedTagIds)}
            className={`${styles.buttonBase} ${styles.blueButton}`}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </CenterPopup>
  );
};

const DynamicFieldPlaceholder = ({ onAddField }) => (
  <div className={styles.dynamicFieldPlaceholder}>
    <button onClick={onAddField} className={styles.addFieldButton}>
      + Thêm trường
    </button>
  </div>
);

// ================================================================================
// --- MAIN COMPONENT (Thành phần chính) ---
// ================================================================================
export default function CustomerDetails({
  customerId,
  onUpdateCustomer,
  user,
}) {
  // [MOD] State chính giờ là `customer`, ban đầu là null
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // State loading mới

  // ... (Các state khác giữ nguyên)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState("");
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const { openPanel } = usePanels();

  useEffect(() => {
    if (!customerId) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      const fullCustomerData = await getCustomerDetails(customerId);
      if (fullCustomerData) {
        setCustomer(fullCustomerData);
        setEditableName(fullCustomerData.name || "");
      }
      setIsLoading(false);
    };

    fetchDetails();
  }, [customerId]);

  // Dữ liệu giả lập cho các trường động và tag
  const mockDynamicFields = [
    {
      id: "field1",
      label: "Trường THPT",
      value: "THPT ABC",
      dataSource: "local_mongodb",
    },
    { id: "field2", label: "Tổng Điểm", value: "25.5", dataSource: "LHU_API" },
  ];
  const mockAllTags = [
    { _id: "tag1", name: "Quan tâm" },
    { _id: "tag2", name: "Tiềm năng" },
    { _id: "tag3", name: "Đã liên hệ" },
    { _id: "tag4", name: "Cần theo dõi" },
  ];

  const handleSaveName = async () => {
    setIsEditingName(false);
    // Logic gọi API sẽ ở đây
  };

  const handleShowHistory = () => {
    openPanel({
      id: `history-${customer._id}`,
      title: `Lịch sử: ${customer.name}`,
      component: CustomerHistoryPanel,
      props: { panelData: { customerId: customer._id } },
    });
  };

  const handleSaveTags = (selectedIds) => {
    console.log("Saving tags:", Array.from(selectedIds));
    setIsTagEditorOpen(false);
  };

  // [MOD] Thêm màn hình loading
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading content="Đang tải dữ liệu chi tiết..." />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className={styles.errorText}>Không thể tải dữ liệu khách hàng.</div>
    );
  }

  // [MOD] JSX render giờ sẽ sử dụng state `customer` đã được fetch đầy đủ
  return (
    <>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* [MOD] Section "Thông tin cơ bản" mặc định mở rộng */}
          <CollapsibleSection title="Thông tin cơ bản" initialCollapsed={false}>
            <InfoRow label="Tên khách hàng">
              {isEditingName ? (
                <div className={styles.editInputContainer}>
                  <input
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    className={styles.inlineInput}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className={styles.inlineSaveButton}
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className={styles.inlineCancelButton}
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <>
                  <span>{customer.name || "(chưa có tên)"}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className={styles.inlineButton}
                  >
                    <Svg_Edit w={14} h={14} /> Sửa
                  </button>
                </>
              )}
            </InfoRow>
            <InfoRow label="Di động">{customer.phone}</InfoRow>
            <InfoRow label="CCCD">{customer.citizenId || "Chưa có"}</InfoRow>
            <DynamicFieldPlaceholder
              onAddField={() => alert("Chức năng đang phát triển")}
            />
          </CollapsibleSection>

          {/* [MOD] Section "Tags" mặc định thu gọn */}
          <CollapsibleSection title="Tags" initialCollapsed={true}>
            <div className={styles.tagContainer}>
              {/* [MOD] Sử dụng dữ liệu giả lập */}
              {mockAllTags.slice(0, 2).map((tag) => (
                <span key={tag._id} className={styles.tagItem}>
                  {tag.name}
                </span>
              ))}
            </div>
            <div className={styles.buttonContainer}>
              <button
                className={`${styles.buttonBase} ${styles.ghostButton} ${styles.fullWidthButton}`}
                onClick={() => setIsTagEditorOpen(true)}
              >
                Thay đổi Tags
              </button>
            </div>
          </CollapsibleSection>

          {/* [MOD] Logic render các chương trình chăm sóc giờ sẽ hoạt động chính xác */}
          {(customer.programEnrollments || []).map((enrollment) => (
            <CollapsibleSection
              key={enrollment.programId?._id || Math.random()}
              title={
                enrollment.programId?.name || "Chương trình không xác định"
              }
              initialCollapsed={true}
            >
              <InfoRow label="Giai đoạn">
                <StageIndicator
                  level={enrollment.stage?.level || 0}
                  totalStages={enrollment.programId?.stages?.length || 0}
                />
              </InfoRow>
              <InfoRow label="Trạng thái">
                <span>{enrollment.status?.name || "Chưa có"}</span>
                <button className={styles.inlineButton}>
                  <Svg_Edit w={14} h={14} /> Thay đổi
                </button>
              </InfoRow>
              {/* Render các dynamic field giả lập */}
              {mockDynamicFields.map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  onValueChange={(id, val) => console.log(id, val)}
                />
              ))}
              <DynamicFieldPlaceholder
                onAddField={() => alert("Chức năng đang phát triển")}
              />
            </CollapsibleSection>
          ))}

          <CollapsibleSection
            title="Nhân viên phụ trách"
            initialCollapsed={true}
          >
            <div className={styles.userItem}>Nguyễn Văn A</div>
            <p className={styles.placeholderText}>
              Chưa có nhân viên nào khác.
            </p>
          </CollapsibleSection>

          {/* === SECTION: HÀNH ĐỘNG & LỊCH SỬ === */}
          <div className={styles.section}>
            <div className={styles.buttonContainer}>
              <button
                className={`${styles.buttonBase} ${styles.ghostButton} ${styles.fullWidthButton}`}
                onClick={handleShowHistory}
              >
                <Svg_History w={16} h={16} /> Xem toàn bộ lịch sử
              </button>
            </div>
          </div>
        </div>
      </div>

      {isTagEditorOpen && (
        <TagEditor
          allTags={mockAllTags}
          customerTags={customer.tags || []}
          onSave={handleSaveTags}
          onClose={() => setIsTagEditorOpen(false)}
        />
      )}
    </>
  );
}
