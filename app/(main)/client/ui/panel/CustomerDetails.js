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
// [ADD] Import UserTag để hiển thị nhân viên
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

// [MOD] Nâng cấp CommentSection
const CommentSection = ({
  comments = [],
  customerId,
  onCommentAdded,
  user,
}) => {
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExpanded, setIsExpanded] = useState(false);
  const commentsEndRef = useRef(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Tự cuộn khi component được mở hoặc có comment mới
    scrollToBottom();
  }, [comments, isExpanded]);

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

  const displayedComments = isExpanded
    ? comments.slice().reverse()
    : comments.slice(-3).reverse();

  return (
    <CollapsibleSection
      title={`Bình luận (${comments.length})`}
      initialCollapsed={false}
    >
      <div
        className={`${styles.commentList} ${isExpanded ? styles.expanded : ""}`}
      >
        {displayedComments.length > 0 ? (
          displayedComments.map((comment) => {
            const isCurrentUser =
              comment.user?._id?.toString() === user?._id?.toString();
            return (
              <div
                key={comment._id}
                className={`${styles.commentItem} ${
                  isCurrentUser ? styles.currentUserComment : ""
                }`}
              >
                <div className={styles.commentBubble}>
                  {!isCurrentUser && (
                    <p className={styles.commentAuthor}>
                      {comment.user?.name || "Không rõ"}
                    </p>
                  )}
                  <p className={styles.commentText}>{comment.detail}</p>
                </div>
                <p className={styles.commentMeta}>
                  bởi <strong>{comment.user?.name || "Không rõ"}</strong> lúc{" "}
                  {new Date(comment.time).toLocaleString("vi-VN")}
                </p>
              </div>
            );
          })
        ) : (
          <p className={styles.placeholderText}>Chưa có bình luận.</p>
        )}
        <div ref={commentsEndRef} />
      </div>

      {!isExpanded && comments.length > 3 && (
        <button
          onClick={() => setIsExpanded(true)}
          className={styles.inlineButton}
        >
          Xem thêm...
        </button>
      )}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className={styles.inlineButton}
        >
          Thu gọn
        </button>
      )}

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
    </CollapsibleSection>
  );
};

// ... Các component InfoRow, DynamicField không đổi ...
const InfoRow = ({ label, children }) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <div className={styles.infoValue}>{children}</div>
  </div>
);
const DynamicField = ({ label, value }) => {
  return (
    <div className={styles.infoRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.infoValue}>
        <span className={styles.fieldValue}>{value || "(chưa có)"}</span>
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
  const [allSystemTags, setAllSystemTags] = useState([]);
  const { openPanel } = usePanels();

  // [MOD] State cho form inline thay vì popup
  const [addingFieldScope, setAddingFieldScope] = useState(null); // null, 'COMMON', or a programId

  // [LOG] 3.1: Kiểm tra toàn bộ dữ liệu customer mà component nhận được
  console.log(
    "[LOG-Frontend] Dữ liệu đầy đủ của khách hàng trong panel:",
    customer,
  );

  const fieldDefinitionMap = useMemo(() => {
    if (!customer?.fieldDefinitions) return new Map();
    return new Map(
      customer.fieldDefinitions.map((def) => [
        def._id.toString(),
        def.fieldLabel,
      ]),
    );
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

  const handleSaveTags = async (tagIds) => {
    const result = await updateCustomerTags({ customerId, tagIds });
    if (result.success) {
      await fetchDetails();
    } else {
      alert(`Lỗi: ${result.error}`);
    }
  };

  const handleShowHistory = () => {
    openPanel({
      id: `history-${customer._id}`,
      title: `Lịch sử: ${customer.name}`,
      component: CustomerHistoryPanel,
      props: { panelData: { customerId: customer._id } },
    });
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
        {/* [MOD] Mặc định mở */}
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
          {/* [MOD] Form inline được render tại đây */}
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

        {/* [MOD] Section lớn mặc định mở, chứa các section con */}
        <CollapsibleSection title="Thông tin chăm sóc" initialCollapsed={false}>
          <div className={styles.subSectionContainer}>
            <CollapsibleSection
              title={`Tags (${(customer.tags || []).length})`}
              initialCollapsed={true}
            >
              <MultiSelectDropdown
                label="Tags"
                options={allSystemTags.map((tag) => ({
                  id: tag._id,
                  name: tag.name,
                }))}
                selectedIds={(customer.tags || []).map((tag) => tag._id)}
                onChange={handleSaveTags}
                displayAs="chip"
              />
            </CollapsibleSection>

            <CollapsibleSection
              title={`Nhân viên phụ trách (${(customer.users || []).length})`}
              initialCollapsed={true}
            >
              {(customer.users || []).length > 0 ? (
                <div className={styles.userGrid}>
                  {customer.users.map((user) => (
                    <UserTag key={user._id} user={user} displayMode="card" />
                  ))}
                </div>
              ) : (
                <p className={styles.placeholderText}>
                  Chưa có nhân viên phụ trách.
                </p>
              )}
            </CollapsibleSection>

            <CommentSection
              comments={customer.comments}
              customerId={customer._id}
              onCommentAdded={fetchDetails}
              user={user}
            />
          </div>
        </CollapsibleSection>

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
  );
}
