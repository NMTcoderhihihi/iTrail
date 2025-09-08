"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./client.module.css";
import Setting from "./ui/setting";
import { usePanels } from "@/contexts/PanelContext";
import CustomerDetails from "./ui/details/CustomerDetails";
import MultiSelectFilter from "./ui/filters/MultiSelectFilter";
import UidZaloFilter from "./ui/filters/UidZaloFilter";
import CustomerTable from "./ui/table/CustomerTable";
import PaginationControls from "@/app/(main)/admin/components/shared/PaginationControls";
import ProgramDashboard from "./ui/dashboard/ProgramDashboard";

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

const Filters = ({ allTags, allZaloAccounts, carePrograms }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const programId = searchParams.get("program");
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
      Object.keys(filtersToUpdate).forEach((key) => params.delete(key));

      for (const [key, value] of Object.entries(filtersToUpdate)) {
        if (value instanceof Set) {
          value.forEach((v) => params.append(key, v));
        } else if (value && value !== "all") {
          params.set(key, value);
        }
      }

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
            if (e.key === "Enter") {
              handleFilterChange({ query: e.target.value });
            }
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
            if (value === "all") {
              setSelectedUidStatus("all");
              handleFilterChange({ uidFilterZaloId: "all" });
            } else {
              handleFilterChange({
                uidFilterZaloId: value,
                uidStatus: selectedUidStatus,
              });
            }
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

      {/* Contextual Filters */}
      {currentProgram && (
        <>
          <div className={styles.filterGroup}>
            <label>Giai đoạn</label>
            <MultiSelectFilter
              title="Chọn giai đoạn"
              // Thêm `|| []` để phòng trường hợp stages không tồn tại
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
              // Thêm `|| []` để phòng trường hợp statuses không tồn tại
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
    </>
  );
};

export default function ClientPage({
  initialData,
  initialPagination,
  user,
  initialZaloAccounts,
  allTags,
  carePrograms = [],
  // [ADD] Nhận prop initialStats
  initialStats,
}) {
  const { openPanel, allActivePanels } = usePanels();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [customers, setCustomers] = useState(initialData);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  useEffect(() => {
    setCustomers(initialData);
  }, [initialData]);

  const activeRowIds = useMemo(() => {
    return new Set(
      (allActivePanels || [])
        .filter((p) => p.id.startsWith("details-"))
        .map((p) => p.id.replace("details-", "")),
    );
  }, [allActivePanels]);

  const handleRowClick = useCallback(
    (customer) => {
      openPanel({
        id: `details-${customer._id}`,
        component: CustomerDetails,
        title: `Chi tiết: ${customer.name}`,
        props: {
          // [MOD] Chỉ truyền customerId, không truyền cả object customerData nữa
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTogglePage = useCallback(() => {
    const allOnPage =
      customers.length > 0 && customers.every((c) => selectedIds.has(c._id));
    const newSet = new Set(selectedIds);
    if (allOnPage) {
      customers.forEach((c) => newSet.delete(c._id));
    } else {
      customers.forEach((c) => newSet.add(c._id));
    }
    setSelectedIds(newSet);
  }, [customers, selectedIds]);

  const handlePageChange = (page, limit) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const currentProgramId = searchParams.get("program");
  const currentProgram = currentProgramId
    ? carePrograms.find((p) => p._id === currentProgramId)
    : null;

  // [ADD] Dữ liệu giả lập cho Dashboard
  const dashboardStats = useMemo(() => {
    if (currentProgram) {
      // Dữ liệu cho tab chương trình cụ thể
      return {
        totalCustomers: 120,
        byStage: ["CS: 50", "OTP: 30", "NH: 40"],
        byStatus: ["Đã LH: 80", "K Bắt máy: 20"],
        noStatus: 20,
      };
    }
    // Dữ liệu cho tab "Tất cả"
    return {
      totalPrograms: carePrograms.length,
      totalCustomers: 250,
      totalCampaigns: 15,
      customersPerProgram: ["TS2025: 120", "CSKH: 130"],
    };
  }, [currentProgram, carePrograms]);

  return (
    <div className={styles.container}>
      {/* [MOD] Chỉ render header nếu có item được chọn */}
      {selectedIds.size > 0 && (
        <div className={styles.pageHeader}>
          <button className={styles.btnCampaign}>
            Lên chiến dịch ({selectedIds.size})
          </button>
        </div>
      )}

      {/* [MOD] Truyền initialStats trực tiếp vào component */}
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
        <div className={styles.filterControls}>
          <Filters
            allTags={allTags}
            allZaloAccounts={initialZaloAccounts}
            carePrograms={carePrograms}
          />
        </div>
      </div>

      <div className={styles.gridWrapper}>
        <CustomerTable
          customers={customers}
          zaloAccounts={initialZaloAccounts}
          pagination={initialPagination}
          currentProgram={currentProgram}
          onRowClick={handleRowClick}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onTogglePage={handleTogglePage}
        />

        <PaginationControls
          pagination={initialPagination}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
