// [ADD] app/(main)/admin/components/ReportManagement/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePanels } from "@/contexts/PanelContext";
// [FIX] Tách import: queries và actions ra 2 dòng riêng biệt
import { getReportLayouts } from "@/app/data/report/report.queries";
import { deleteReportLayout } from "@/app/data/report/report.actions";
import LoadingSpinner from "../shared/LoadingSpinner";
import PaginationControls from "../shared/PaginationControls";
import DataTable from "../datatable/DataTable";
import ReportLayoutEditorPanel from "../Panel/ReportLayoutEditorPanel";

export default function ReportManagement() {
  const { openPanel, closePanel, allActivePanels } = usePanels();
  const [layouts, setLayouts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const activeLayoutIds = useMemo(() => {
    return (allActivePanels || [])
      .filter((panel) => panel.id.startsWith("report-layout-"))
      .map((panel) => panel.id.replace("report-layout-", ""));
  }, [allActivePanels]);

  const fetchData = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    const result = await getReportLayouts({ page, limit });
    if (result.success) {
      setLayouts(result.data);
      setPagination(result.pagination);
    } else {
      alert(`Lỗi: ${result.error}`);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPanel = (layout = null) => {
    const panelId = `report-layout-${layout?._id || "new"}`;
    openPanel({
      id: panelId,
      title: layout
        ? `Chỉnh sửa: ${layout.layoutName}`
        : "Tạo Layout Báo cáo Mới",
      component: ReportLayoutEditorPanel,
      props: {
        layoutId: layout?._id,
        onSaveSuccess: () => {
          fetchData(pagination.page, pagination.limit);
          closePanel(panelId);
        },
      },
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa Layout này?")) {
      const result = await deleteReportLayout(id);
      if (result.success) {
        fetchData(pagination.page, pagination.limit);
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    }
  };

  const columns = [
    { header: "Tên Layout", accessor: "layoutName", width: "2fr" },
    { header: "Mô tả", accessor: "description", width: "3fr" },
    {
      header: "Số Widgets",
      width: "1fr",
      cell: (item) => item.widgets?.length || 0,
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={layouts}
          onRowClick={handleOpenPanel}
          onAddItem={() => handleOpenPanel(null)}
          onDeleteItem={handleDelete}
          showActions={true}
          activeRowId={activeLayoutIds}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <PaginationControls pagination={pagination} onPageChange={fetchData} />
      </div>
    </div>
  );
}
