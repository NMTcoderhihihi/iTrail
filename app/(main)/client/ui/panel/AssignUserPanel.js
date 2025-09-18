// [MOD] app/(main)/client/ui/panel/CustomerDetails.js
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useTransition,
  useRef,
} from "react";
import styles from "./CustomerDetails.module.css";
import {
  getCustomerDetails,
  updateCustomerTags,
  addCommentToCustomer,
  createAndAssignManualField,
} from "@/app/data/customer/customer.actions";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { usePanels } from "@/contexts/PanelContext";
import { Svg_History, Svg_Edit, Svg_Plus } from "@/components/(icon)/svg";
import Loading from "@/components/(ui)/(loading)/loading";
import StageIndicator from "@/components/(ui)/progress/StageIndicator";
import CustomerHistoryPanel from "./CustomerHistoryPanel";
import MultiSelectDropdown from "@/app/(main)/admin/components/Panel/MultiSelectDropdown";
import UserTag from "@/app/(main)/admin/components/shared/UserTag";

// ================================================================================
// --- HELPER COMPONENTS ---
// ================================================================================

// [ADD] Form thêm trường dữ liệu inline
const AddFieldInlineForm = ({ onSave, onCancel, programId = null }) => {
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (!fieldLabel.trim() || !fieldValue.trim()) {
      alert("Vui lòng nhập cả Tên trường và Giá trị.");
      return;
    }
    startTransition(async () => {
      await onSave({ fieldLabel, fieldValue, programId });
    });
  };

  return (
    <div className={styles.inlineAddFieldForm}>
      <div className={styles.formGroup}>
        <label>Tên Trường Mới</label>
        <input
          type="text"
          value={fieldLabel}
          onChange={(e) => setFieldLabel(e.target.value)}
          placeholder="Ví dụ: Link Facebook..."
          className={styles.input}
          disabled={isPending}
        />
      </div>
      <div className={styles.formGroup}>
        <label>Giá trị</label>
        <textarea
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          placeholder="Nhập giá trị..."
          className={styles.textarea}
          rows={3}
          disabled={isPending}
        />
      </div>
      <div className={styles.popupActions}>
        <button
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isPending}
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={isPending}
        >
          {isPending ? "..." : "Lưu"}
        </button>
      </div>
    </div>
  );
};

const CollapsibleSection = ({
  title,
  initialCollapsed = false,
  onAddClick,
  children,
}) => {
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
        <div className={styles.sectionHeaderActions}>
          {onAddClick && !isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick();
              }}
              className={styles.addFieldButtonSmall}
            >
              <Svg_Plus w={14} h={14} /> Thêm
            </button>
          )}
          <Icon />
        </div>
      </div>
      {!isCollapsed && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
};
// ... (CommentSection, InfoRow, DynamicField không thay đổi) ...

// --- Main Component ---
export default function CustomerDetails({
  customerId,
  onUpdateCustomer,
  user,
}) {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allSystemTags, setAllSystemTags] = useState([]);
  const { openPanel } = usePanels();
  const [addingFieldScope, setAddingFieldScope] = useState(null);

  const fieldDefinitionMap = useMemo(() => {
    // ...
  }, [customer]);

  const fetchDetails = useCallback(async () => {
    const fullCustomerData = await getCustomerDetails(customerId);
    if (fullCustomerData) {
      setCustomer(fullCustomerData);
    }
    // [MOD] Gọi onUpdateCustomer để refresh cả bảng ClientPage
    if (onUpdateCustomer) {
      onUpdateCustomer();
    }
  }, [customerId, onUpdateCustomer]);

  useEffect(() => {
    // ...
  }, [customerId]);

  const handleSaveTags = async (tagIds) => {
    // ...
  };

  const handleShowHistory = () => {
    // ...
  };

  const handleSaveNewField = async ({ fieldLabel, fieldValue, programId }) => {
    const result = await createAndAssignManualField({
      customerId,
      fieldLabel,
      fieldValue,
      programId,
    });
    if (result.success) {
      setAddingFieldScope(null);
      await fetchDetails();
    } else {
      alert(`Lỗi: ${result.error}`);
    }
  };

  if (isLoading)
    return (
      <div className={styles.loadingContainer}>
        <Loading content="Đang tải..." />
      </div>
    );
  if (!customer)
    return <div className={styles.errorText}>Không thể tải dữ liệu.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <CollapsibleSection
          title="Thông tin chung"
          initialCollapsed={false}
          onAddClick={() => setAddingFieldScope("COMMON")}
        >
          <InfoRow label="Tên khách hàng">
            {customer.name || "(chưa có tên)"}
          </InfoRow>
          <InfoRow label="Di động">{customer.phone}</InfoRow>
          <InfoRow label="CCCD">{customer.citizenId || "Chưa có"}</InfoRow>
          {(customer.customerAttributes || []).map((attr) => (
            <DynamicField
              key={attr.definitionId}
              label={
                fieldDefinitionMap.get(attr.definitionId.toString()) || "..."
              }
              value={attr.value?.[0]}
            />
          ))}
          {addingFieldScope === "COMMON" && (
            <AddFieldInlineForm
              onSave={handleSaveNewField}
              onCancel={() => setAddingFieldScope(null)}
            />
          )}
        </CollapsibleSection>

        {(customer.programEnrollments || []).map((enrollment) => (
          <CollapsibleSection
            key={enrollment.programId?._id || Math.random()}
            title={`Chương trình: ${enrollment.programId?.name || "..."}`}
            initialCollapsed={true}
            onAddClick={() => setAddingFieldScope(enrollment.programId?._id)}
          >
            <InfoRow label="Giai đoạn">
              <StageIndicator
                level={enrollment.stage?.level || 0}
                totalStages={enrollment.programId?.stages?.length || 1}
              />
            </InfoRow>
            <InfoRow label="Trạng thái">
              <span>{enrollment.status?.name || "Chưa có"}</span>
              <button className={styles.inlineButton}>
                <Svg_Edit w={14} h={14} /> Thay đổi
              </button>
            </InfoRow>
            {(enrollment.programData || []).map((attr) => (
              <DynamicField
                key={attr.definitionId}
                label={
                  fieldDefinitionMap.get(attr.definitionId.toString()) || "..."
                }
                value={attr.value?.[0]}
              />
            ))}
            {addingFieldScope === enrollment.programId?._id && (
              <AddFieldInlineForm
                onSave={handleSaveNewField}
                onCancel={() => setAddingFieldScope(null)}
                programId={enrollment.programId?._id}
              />
            )}
          </CollapsibleSection>
        ))}

        {/* ... các section còn lại không đổi ... */}
      </div>
    </div>
  );
}
