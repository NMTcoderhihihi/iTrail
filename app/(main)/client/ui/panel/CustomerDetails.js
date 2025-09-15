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
// [MOD] Import MultiSelectDropdown thay cho CenterPopup
import MultiSelectDropdown from "@/app/(main)/admin/components/Panel/MultiSelectDropdown";

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

// [MOD] This component now takes label and value directly
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

const CommentSection = ({
  comments = [],
  customerId,
  onCommentAdded,
  user,
}) => {
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
        {/* [MOD] Thêm .slice().reverse() để đảo ngược thứ tự hiển thị */}
        {(comments || [])
          .slice()
          .reverse()
          .map((comment) => {
            // [FIX] So sánh ID an toàn hơn
            const isCurrentUser =
              comment.user?._id?.toString() === user?.id?.toString();
            return (
              <div
                key={comment._id}
                // [MOD] Thêm class 'currentUser' nếu đúng
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
          })}
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
  const [allSystemTags, setAllSystemTags] = useState([]);
  const { openPanel } = usePanels();

  // [MOD] Create a simple map for looking up field labels
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

  const handleSaveTags = async (tagIds) => {
    const result = await updateCustomerTags({ customerId, tagIds });
    if (result.success) {
      await fetchDetails();
      onUpdateCustomer();
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

            {/* [REFACTOR] Render directly from customerAttributes */}
            {(customer.customerAttributes || []).map((attr) => (
              <DynamicField
                key={attr.definitionId}
                label={
                  fieldDefinitionMap.get(attr.definitionId.toString()) ||
                  "Trường không xác định"
                }
                value={attr.value?.[0]}
              />
            ))}
          </CollapsibleSection>

          {(customer.programEnrollments || []).map((enrollment) => (
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

              {/* [REFACTOR] Render directly from programData */}
              {(enrollment.programData || []).map((attr) => (
                <DynamicField
                  key={attr.definitionId}
                  label={
                    fieldDefinitionMap.get(attr.definitionId.toString()) ||
                    "Trường không xác định"
                  }
                  value={attr.value?.[0]}
                />
              ))}
            </CollapsibleSection>
          ))}

          <CollapsibleSection
            title="Thông tin chăm sóc"
            initialCollapsed={true}
          >
            <div className={styles.subSection}>
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
              user={user}
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
    </>
  );
}
