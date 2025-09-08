// [ADD] app/(main)/admin/components/DataSourceManagement/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePanels } from "@/contexts/PanelContext";
// [FIX] Tách import: queries và actions ra 2 dòng riêng biệt
import { getDataSources } from "@/app/data/dataSource/dataSource.queries";
import {
  createOrUpdateDataSource,
  deleteDataSource,
} from "@/app/data/dataSource/dataSource.actions";
import LoadingSpinner from "../shared/LoadingSpinner";
import PaginationControls from "../shared/PaginationControls";
import DataTable from "../datatable/DataTable";
import DataSourceEditorPanel from "../Panel/DataSourceEditorPanel";

export default function DataSourceManagement() {
  const { openPanel, closePanel, allActivePanels } = usePanels();
  const [sources, setSources] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const activeSourceIds = useMemo(() => {
    return (allActivePanels || [])
      .filter((panel) => panel.id.startsWith("datasource-"))
      .map((panel) => panel.id.replace("datasource-", ""));
  }, [allActivePanels]);

  const fetchData = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    const result = await getDataSources({ page, limit });
    if (result.success) {
      setSources(result.data);
      setPagination(result.pagination);
    } else {
      alert(`Lỗi: ${result.error}`);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPanel = (source = null) => {
    const panelId = `datasource-${source?._id || "new"}`;
    openPanel({
      id: panelId,
      title: source ? `Chỉnh sửa: ${source.name}` : "Tạo Nguồn Dữ liệu Mới",
      component: DataSourceEditorPanel,
      props: {
        dataSourceId: source?._id,
        onSaveSuccess: () => {
          fetchData(pagination.page, pagination.limit);

          closePanel(panelId);
        },
      },
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa vĩnh viễn Nguồn dữ liệu này không?")) {
      const result = await deleteDataSource(id);
      if (result.success) {
        fetchData(pagination.page, pagination.limit);
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    }
  };

  const columns = [
    { header: "Tên Nguồn", accessor: "name", width: "1.5fr" },
    { header: "Loại", accessor: "connectorType", width: "1fr" },
    { header: "Mô tả", accessor: "description", width: "2fr" },
    {
      header: "Người tạo",
      width: "1fr",
      cell: (item) => item.createdBy?.name || "N/A",
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={sources}
          onRowClick={handleOpenPanel}
          onAddItem={() => handleOpenPanel(null)}
          onDeleteItem={handleDelete}
          showActions={true}
          activeRowId={activeSourceIds}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <PaginationControls pagination={pagination} onPageChange={fetchData} />
      </div>
    </div>
  );
}
