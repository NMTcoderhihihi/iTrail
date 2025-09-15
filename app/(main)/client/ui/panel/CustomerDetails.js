// [FIX] app/(main)/client/ui/panel/CustomerDetails.js
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useTransition,
} from "react";
import styles from "./CustomerDetails.module.css";
import {
  getCustomerDetails,
  updateCustomerTags,
  updateCustomerAttribute,
  addCommentToCustomer,
} from "@/app/data/customer/customer.actions";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { usePanels } from "@/contexts/PanelContext";
import { Svg_History, Svg_Edit } from "@/components/(icon)/svg";
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

// [MOD] Đơn giản hóa DynamicField, chỉ cần nhận và hiển thị
const DynamicField = ({ field, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(field.value?.[0] || "");
  const [isPending, startTransition] = useTransition();

  // [FIX] Xóa bỏ hook useMemo gây lỗi. Component này giờ chỉ nhận và hiển thị.

  // Cập nhật lại state nội bộ khi prop `field` từ bên ngoài thay đổi
  useEffect(() => {
    setCurrentValue(field.value?.[0] || "");
  }, [field.value]);

  const handleSave = () => {
    startTransition(async () => {
      // Logic lưu vào DB sẽ được xử lý sau. Hiện tại chỉ là ví dụ.
      // await onSave(field.fieldDefinition._id, currentValue);
      setIsEditing(false);
    });
  };

  return (
    <div className={styles.infoRow}>
      <span className={styles.fieldLabel}>
        {field.fieldDefinition.fieldLabel}
      </span>
      <div className={styles.infoValue}>
        {isEditing ? (
          <div className={styles.editInputContainer}>
            <input
              type="text"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className={styles.inlineInput}
              autoFocus
            />
            <button
              onClick={handleSave}
              className={styles.inlineSaveButton}
              disabled={isPending}
            >
              {isPending ? "..." : "Lưu"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className={styles.inlineCancelButton}
              disabled={isPending}
            >
              Hủy
            </button>
          </div>
        ) : (
          <span
            className={styles.fieldValue}
            onClick={() => setIsEditing(true)}
          >
            {currentValue || "(chưa có)"}
          </span>
        )}
      </div>
    </div>
  );
};

const TagEditor = ({ allTags, customerTags, onSave, onClose }) => {
  const [selectedTagIds, setSelectedTagIds] = useState(
    () => new Set((customerTags || []).map((t) => t._id)),
  );

  const handleToggle = (tagId) => {
    const newSet = new Set(selectedTagIds);
    newSet.has(tagId) ? newSet.delete(tagId) : newSet.add(tagId);
    setSelectedTagIds(newSet);
  };

  return (
    <CenterPopup open={true} onClose={onClose} title="Chỉnh sửa Tags" size="md">
      <div className={styles.tagEditorContainer}>
        <div className={styles.tagList}>
          {(allTags || []).map((tag) => (
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
            onClick={() => onSave(Array.from(selectedTagIds))}
            className={`${styles.buttonBase} ${styles.blueButton}`}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </CenterPopup>
  );
};

const CommentSection = ({ comments = [], customerId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    startTransition(async () => {
      const result = await addCommentToCustomer({
        customerId,
        detail: newComment,
      });
      if (result.success) {
        setNewComment("");
        onCommentAdded();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  return (
    <div className={styles.subSection}>
      <h4 className={styles.subSectionTitle}>Bình luận</h4>
      <div className={styles.commentList}>
        {(comments || []).map((comment) => (
          <div key={comment._id} className={styles.commentItem}>
            <p className={styles.commentText}>{comment.detail}</p>
            <p className={styles.commentMeta}>
              bởi <strong>{comment.user?.name || "Không rõ"}</strong> lúc{" "}
              {new Date(comment.time).toLocaleString("vi-VN")}
            </p>
          </div>
        ))}
      </div>
      <div className={styles.commentInputContainer}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Nhập bình luận mới..."
          className={styles.commentTextarea}
          rows={3}
          disabled={isPending}
        />
        <button
          onClick={handleAddComment}
          className={styles.commentSubmitButton}
          disabled={isPending}
        >
          {isPending ? "..." : "Gửi"}
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function CustomerDetails({
  customerId,
  onUpdateCustomer,
  user,
}) {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTagEditorOpen, setIsTagEditorOpen] = useState(false);
  const [allSystemTags, setAllSystemTags] = useState([]);
  const { openPanel } = usePanels();

  const fetchDetails = useCallback(async () => {
    const fullCustomerData = await getCustomerDetails(customerId);
    if (fullCustomerData) {
      setCustomer(fullCustomerData);
    }
  }, [customerId]);

  useEffect(() => {
    const initialFetch = async () => {
      setIsLoading(true);
      const [customerData, tagsData] = await Promise.all([
        getCustomerDetails(customerId),
        getTagsForFilter(),
      ]);
      if (customerData) setCustomer(customerData);
      if (tagsData) setAllSystemTags(tagsData);
      setIsLoading(false);
    };
    initialFetch();
  }, [customerId]);

  // [FIX] Di chuyển useMemo lên đây, đúng vị trí trong React component
  const { customerScopedFields, programScopedFields } = useMemo(() => {
    if (!customer?.fieldDefinitions)
      return { customerScopedFields: [], programScopedFields: new Map() };

    const customerFields = [];
    const programFields = new Map();

    const allCustomerAttributes = customer.customerAttributes || [];
    const allProgramData = new Map();
    (customer.programEnrollments || []).forEach((enrollment) => {
      allProgramData.set(
        enrollment.programId?._id.toString(),
        enrollment.programData || [],
      );
    });

    customer.fieldDefinitions.forEach((def) => {
      let valueContainer = null;
      if (def.scope === "CUSTOMER") {
        valueContainer = allCustomerAttributes;
      } else if (def.scope === "PROGRAM") {
        const relevantProgramId = (def.programIds[0] || "").toString();
        valueContainer = allProgramData.get(relevantProgramId);
      }

      const attr = (valueContainer || []).find(
        (a) => a.definitionId.toString() === def._id.toString(),
      );

      const fieldData = {
        fieldDefinition: def,
        value: attr?.value,
      };

      if (def.scope === "CUSTOMER") {
        customerFields.push(fieldData);
      } else if (def.scope === "PROGRAM") {
        (def.programIds || []).forEach((pId) => {
          const progIdStr = pId.toString();
          if (!programFields.has(progIdStr)) {
            programFields.set(progIdStr, []);
          }
          programFields.get(progIdStr).push(fieldData);
        });
      }
    });
    return { customerScopedFields, programScopedFields };
  }, [customer]);

  const handleSaveTags = async (tagIds) => {
    const result = await updateCustomerTags({ customerId, tagIds });
    if (result.success) {
      await fetchDetails();
      onUpdateCustomer();
    } else {
      alert(`Lỗi: ${result.error}`);
    }
    setIsTagEditorOpen(false);
  };

  const handleShowHistory = () => {
    openPanel({
      id: `history-${customer._id}`,
      title: `Lịch sử: ${customer.name}`,
      component: CustomerHistoryPanel,
      props: { panelData: { customerId: customer._id } },
    });
  };

  if (isLoading)
    return (
      <div className={styles.loadingContainer}>
        <Loading content="Đang tải dữ liệu chi tiết..." />
      </div>
    );
  if (!customer)
    return (
      <div className={styles.errorText}>Không thể tải dữ liệu khách hàng.</div>
    );

  return (
    <>
      <div className={styles.container}>
        <div className={styles.content}>
          <CollapsibleSection title="Thông tin chung" initialCollapsed={false}>
            <InfoRow label="Tên khách hàng">
              {customer.name || "(chưa có tên)"}
            </InfoRow>
            <InfoRow label="Di động">{customer.phone}</InfoRow>
            <InfoRow label="CCCD">{customer.citizenId || "Chưa có"}</InfoRow>
            {/* [MOD] Render các trường chung */}
            {customerScopedFields.map((field) => (
              <DynamicField
                key={field.fieldDefinition._id}
                field={field}
                onSave={() => {}}
              />
            ))}
          </CollapsibleSection>

          {(customer.programEnrollments || []).map((enrollment) => {
            const fieldsForThisProgram =
              programScopedFields.get(enrollment.programId?._id.toString()) ||
              [];
            return (
              <CollapsibleSection
                key={enrollment.programId?._id || Math.random()}
                title={`Chương trình: ${
                  enrollment.programId?.name || "Không xác định"
                }`}
                initialCollapsed={true}
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
                {/* [MOD] Render các trường riêng của chương trình */}
                {fieldsForThisProgram.map((field) => (
                  <DynamicField
                    key={field.fieldDefinition._id}
                    field={field}
                    onSave={() => {}}
                  />
                ))}
              </CollapsibleSection>
            );
          })}

          {/* Section 3: Thông tin chăm sóc */}
          <CollapsibleSection
            title="Thông tin chăm sóc"
            initialCollapsed={true}
          >
            <div className={styles.subSection}>
              <h4 className={styles.subSectionTitle}>Tags</h4>
              <div className={styles.tagContainer}>
                {(customer.tags || []).length > 0 ? (
                  customer.tags.map((tag) => (
                    <span key={tag._id} className={styles.tagItem}>
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <p className={styles.placeholderText}>Chưa có tag.</p>
                )}
              </div>
              <button
                className={`${styles.buttonBase} ${styles.ghostButton}`}
                onClick={() => setIsTagEditorOpen(true)}
              >
                Thay đổi Tags
              </button>
            </div>
            <div className={styles.subSection}>
              <h4 className={styles.subSectionTitle}>Nhân viên phụ trách</h4>
              {(customer.users || []).length > 0 ? (
                customer.users.map((user) => (
                  <div key={user._id} className={styles.userItem}>
                    {user.name}
                  </div>
                ))
              ) : (
                <p className={styles.placeholderText}>
                  Chưa có nhân viên phụ trách.
                </p>
              )}
            </div>
            <CommentSection
              comments={customer.comments}
              customerId={customer._id}
              onCommentAdded={fetchDetails}
            />
          </CollapsibleSection>

          {/* Section 4: Hành động */}

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

      {isTagEditorOpen && (
        <TagEditor
          allTags={allSystemTags}
          customerTags={customer.tags || []}
          onSave={handleSaveTags}
          onClose={() => setIsTagEditorOpen(false)}
        />
      )}
    </>
  );
}
