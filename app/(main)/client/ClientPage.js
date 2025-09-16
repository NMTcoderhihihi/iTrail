// [FIX] app/(main)/client/ClientPage.js (Sửa lỗi ReferenceError và Initialization)
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "./client.module.css";
import { usePanels } from "@/contexts/PanelContext";
import CustomerDetails from "./ui/panel/CustomerDetails";
import MultiSelectFilter from "./ui/filters/MultiSelectFilter";
import UidZaloFilter from "./ui/filters/UidZaloFilter";
import CustomerTable from "./ui/table/CustomerTable";
import PaginationControls from "@/app/(main)/admin/components/shared/PaginationControls";
import ProgramDashboard from "./ui/dashboard/ProgramDashboard";
import AssignUserPanel from "./ui/panel/AssignUserPanel";
import AssignTagPanel from "./ui/panel/AssignTagPanel";
import AssignProgramPanel from "./ui/panel/AssignProgramPanel";
import Schedule from "./ui/schedule"; // [ADD] Import a schedule component

const CollapseIcon = ({ isCollapsed }) => (
  <svg
    className={styles.collapseIcon}
    style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6 9L12 15L18 9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Filters = ({
  allTags,
  allZaloAccounts,
  carePrograms,
  selectedIds,
  customerCount,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const programId = searchParams.get("program");

  // [LOG] Thêm log để kiểm tra dữ liệu trên CLIENT
  console.log("--- [CLIENT LOG] Dữ liệu nhận được bởi component Filters: ---");
  console.log("programId từ URL:", programId);
  console.log("Mảng carePrograms nhận được:", carePrograms);
  console.log("-------------------------------------------------------------");

  const currentProgram = programId
    ? (carePrograms || []).find((p) => p._id === programId)
    : null;

  const [selectedTags, setSelectedTags] = useState(
    () => new Set(searchParams.getAll("tags")),
  );
  const [selectedZaloId, setSelectedZaloId] = useState(
    searchParams.get("uidFilterZaloId") || "all",
  );
  const [selectedUidStatus, setSelectedUidStatus] = useState(
    searchParams.get("uidStatus") || "all",
  );
  const [selectedStatuses, setSelectedStatuses] = useState(
    () => new Set(searchParams.getAll("statuses")),
  );
  const [selectedStages, setSelectedStages] = useState(
    () => new Set(searchParams.getAll("stages")),
  );

  const handleFilterChange = useCallback(
    (filtersToUpdate) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(filtersToUpdate).forEach(([key, value]) => {
        params.delete(key);
        if (value instanceof Set) {
          value.forEach((v) => params.append(key, v));
        } else if (value && value !== "all") {
          params.set(key, value);
        }
      });

      if (filtersToUpdate.uidFilterZaloId === "all") {
        params.delete("uidFilterZaloId");
        params.delete("uidStatus");
      }

      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  return (
    <>
      <div className={styles.filterGroup}>
        <label>Tìm kiếm (tên/SĐT/CCCD):</label>
        <input
          className={styles.filterInput}
          placeholder="Nhập từ khóa..."
          defaultValue={searchParams.get("query") || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              handleFilterChange({ query: e.target.value });
          }}
        />
      </div>

      <div className={styles.filterGroup}>
        <label>Tags</label>
        <MultiSelectFilter
          title="Chọn tags"
          options={allTags.map((tag) => ({ _id: tag._id, name: tag.name }))}
          selectedValues={selectedTags}
          onChange={(newSet) => {
            setSelectedTags(newSet);
            handleFilterChange({ tags: newSet });
          }}
        />
      </div>

      <div className={styles.filterGroup}>
        <label>UID Status</label>
        <UidZaloFilter
          zaloAccounts={allZaloAccounts}
          selectedZaloId={selectedZaloId}
          selectedUidStatus={selectedUidStatus}
          onZaloChange={(value) => {
            setSelectedZaloId(value);
            handleFilterChange({
              uidFilterZaloId: value,
              uidStatus: value === "all" ? "all" : selectedUidStatus,
            });
          }}
          onStatusChange={(value) => {
            setSelectedUidStatus(value);
            handleFilterChange({
              uidFilterZaloId: selectedZaloId,
              uidStatus: value,
            });
          }}
        />
      </div>

      {currentProgram && (
        <>
          <div className={styles.filterGroup}>
            <label>Giai đoạn</label>
            <MultiSelectFilter
              title="Chọn giai đoạn"
              options={(currentProgram.stages || []).map((s) => ({
                _id: s._id,
                name: s.name,
              }))}
              selectedValues={selectedStages}
              onChange={(newSet) => {
                setSelectedStages(newSet);
                handleFilterChange({ stages: newSet });
              }}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Trạng thái</label>
            <MultiSelectFilter
              title="Chọn trạng thái"
              options={(currentProgram.statuses || []).map((s) => ({
                _id: s._id,
                name: s.name,
              }))}
              selectedValues={selectedStatuses}
              onChange={(newSet) => {
                setSelectedStatuses(newSet);
                handleFilterChange({ statuses: newSet });
              }}
            />
          </div>
        </>
      )}

      <div className={styles.filterGroup}>
        <label>Lọc theo lựa chọn</label>
        <select
          className={styles.filterSelect}
          value={searchParams.get("selectionFilter") || "all"}
          onChange={(e) =>
            handleFilterChange({ selectionFilter: e.target.value })
          }
        >
          <option value="all">Tất cả ({customerCount})</option>
          <option value="selected">Đã chọn ({selectedIds.size})</option>
          <option value="unselected">
            Chưa chọn ({customerCount - selectedIds.size})
          </option>
        </select>
      </div>
    </>
  );
};

// --- Main Component ---

export default function ClientPage({
  initialData,
  initialPagination,
  user,
  initialZaloAccounts,
  allTags,
  allMessageTemplates, // [MOD] Nhận prop mới
  carePrograms = [],
  initialStats,
}) {
  const { openPanel, allActivePanels } = usePanels();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const customers = useMemo(() => initialData, [initialData]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);

  const handleAssignSuccess = () => {
    router.refresh();
    setSelectedIds(new Set());
  };

  const activeRowIds = useMemo(() => {
    return new Set(
      (allActivePanels || [])
        .filter((p) => p.id.startsWith("details-"))
        .map((p) => p.id.replace("details-", "")),
    );
  }, [allActivePanels]);

  // [FIX] Khai báo `displayedCustomers` trước khi nó được sử dụng trong `handleTogglePage`
  const displayedCustomers = useMemo(() => {
    const selectionFilterParam = searchParams.get("selectionFilter") || "all";
    if (selectionFilterParam === "selected") {
      return customers.filter((c) => selectedIds.has(c._id));
    }
    if (selectionFilterParam === "unselected") {
      return customers.filter((c) => !selectedIds.has(c._id));
    }
    return customers;
  }, [customers, selectedIds, searchParams]);

  const handleRowClick = useCallback(
    (customer) => {
      openPanel({
        id: `details-${customer._id}`,
        component: CustomerDetails,
        title: `Chi tiết: ${customer.name}`,
        props: {
          customerId: customer._id,
          onUpdateCustomer: () => router.refresh(),
          user: user,
        },
      });
    },
    [openPanel, user, router],
  );

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleTogglePage = useCallback(() => {
    const allOnPage =
      displayedCustomers.length > 0 &&
      displayedCustomers.every((c) => selectedIds.has(c._id));
    const newSet = new Set(selectedIds);
    if (allOnPage) {
      displayedCustomers.forEach((c) => newSet.delete(c._id));
    } else {
      displayedCustomers.forEach((c) => newSet.add(c._id));
    }
    setSelectedIds(newSet);
  }, [displayedCustomers, selectedIds]);

  const handlePageChange = (page, limit) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    router.push(`${pathname}?${params.toString()}`);
  };
  const handleOpenAssignUserPanel = () => {
    openPanel({
      id: `assign-users-${Date.now()}`,
      title: `Gán nhân viên cho ${selectedIds.size} khách hàng`,
      component: AssignUserPanel,
      props: {
        customerIds: Array.from(selectedIds),
        onAssignSuccess: handleAssignSuccess,
      },
    });
  };

  // [ADD] Hàm mới để mở panel gán tag
  const handleOpenAssignTagPanel = () => {
    openPanel({
      id: `assign-tags-${Date.now()}`,
      title: `Gán Tag cho ${selectedIds.size} khách hàng`,
      component: AssignTagPanel,
      props: {
        customerIds: Array.from(selectedIds),
        onAssignSuccess: handleAssignSuccess,
      },
    });
  };

  // [ADD] Hàm mới để mở panel gán chương trình
  const handleOpenAssignProgramPanel = () => {
    openPanel({
      id: `assign-program-${Date.now()}`,
      title: `Gán Chương trình cho ${selectedIds.size} khách hàng`,
      component: AssignProgramPanel,
      props: {
        customerIds: Array.from(selectedIds),
        onAssignSuccess: handleAssignSuccess,
        user: user,
      },
    });
  };

  // [ADD] Hàm mới để mở panel lên lịch chiến dịch
  const handleOpenSchedulePanel = () => {
    const selectedCustomers = initialData.filter((c) => selectedIds.has(c._id));
    openPanel({
      id: `schedule-campaign-${Date.now()}`,
      title: `Lên chiến dịch cho ${selectedIds.size} khách hàng`,
      component: Schedule,
      props: {
        user: user,
        label: allMessageTemplates, // [MOD] Truyền đúng dữ liệu mẫu tin nhắn
        initialData: selectedCustomers,
      },
    });
  };

  const currentProgramId = searchParams.get("program");
  const currentProgram = currentProgramId
    ? carePrograms.find((p) => p._id === currentProgramId)
    : null;

  return (
    <div className={styles.container}>
      {selectedIds.size > 0 && (
        <div className={styles.pageHeader}>
          <span className={styles.selectionCount}>
            Đã chọn: {selectedIds.size}
          </span>
          {/* [MOD] Gắn sự kiện onClick vào nút "Lên chiến dịch" */}
          <button
            onClick={handleOpenSchedulePanel}
            className={`${styles.actionButton} ${styles.btnCampaign}`}
          >
            Lên chiến dịch
          </button>
          {/* [MOD] Gắn sự kiện onClick cho nút Gán Tag */}
          <button
            onClick={handleOpenAssignTagPanel}
            className={`${styles.actionButton} ${styles.btnTag}`}
          >
            Gán Tag
          </button>
          {user.role === "Admin" && (
            <>
              <button
                onClick={handleOpenAssignUserPanel}
                className={`${styles.actionButton} ${styles.btnAdmin}`}
              >
                Gán User
              </button>
              {/* [MOD] Gắn sự kiện onClick cho nút Gán Chương trình */}
              <button
                onClick={handleOpenAssignProgramPanel}
                className={`${styles.actionButton} ${styles.btnAdmin}`}
              >
                Gán Chương trình
              </button>
            </>
          )}
        </div>
      )}

      <ProgramDashboard program={currentProgram} stats={initialStats} />

      <div
        className={`${styles.filterSection} ${
          isFilterCollapsed ? styles.collapsed : ""
        }`}
      >
        <div
          className={styles.filterHeader}
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
        >
          <h3>Bộ lọc & Tìm kiếm</h3>
          <CollapseIcon isCollapsed={isFilterCollapsed} />
        </div>
        {!isFilterCollapsed && (
          <div className={styles.filterControls}>
            <Filters
              allTags={allTags}
              allZaloAccounts={initialZaloAccounts}
              carePrograms={carePrograms}
              selectedIds={selectedIds}
              customerCount={customers.length}
            />
          </div>
        )}
      </div>

      <div className={styles.gridWrapper}>
        <CustomerTable
          customers={displayedCustomers}
          zaloAccounts={initialZaloAccounts}
          pagination={initialPagination}
          currentProgram={currentProgram}
          onRowClick={handleRowClick}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onTogglePage={handleTogglePage}
          activeRowIds={activeRowIds}
        />
        <PaginationControls
          pagination={initialPagination}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
