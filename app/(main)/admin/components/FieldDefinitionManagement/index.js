// [ADD] app/(main)/admin/components/FieldDefinitionManagement/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePanels } from "@/contexts/PanelContext";
import { getFieldDefinitions } from "@/app/data/fieldDefinition/fieldDefinition.queries";
import { deleteFieldDefinition } from "@/app/data/fieldDefinition/fieldDefinition.actions";
import LoadingSpinner from "../shared/LoadingSpinner";
import PaginationControls from "../shared/PaginationControls";
import DataTable from "../datatable/DataTable";
import FieldDefinitionEditorPanel from "../Panel/FieldDefinitionEditorPanel";

export default function FieldDefinitionManagement() {
  const { openPanel, closePanel, allActivePanels } = usePanels();
  const [fields, setFields] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const activeFieldIds = useMemo(() => {
    return (allActivePanels || [])
      .filter((panel) => panel.id.startsWith("field-def-"))
      .map((panel) => panel.id.replace("field-def-", ""));
  }, [allActivePanels]);

  const fetchData = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    const result = await getFieldDefinitions({ page, limit });
    if (result.success) {
      setFields(result.data);
      setPagination(result.pagination);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPanel = (field = null) => {
    const panelId = `field-def-${field?._id || "new"}`;
    openPanel({
      id: panelId,
      title: field ? `Chỉnh sửa: ${field.fieldName}` : "Tạo Trường Dữ liệu Mới",
      component: FieldDefinitionEditorPanel,
      props: {
        fieldId: field?._id,
        onSaveSuccess: () => {
          fetchData(pagination.page, pagination.limit);
          closePanel(panelId);
        },
      },
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa vĩnh viễn Trường dữ liệu này không?")) {
      const result = await deleteFieldDefinition(id);
      if (result.success) {
        fetchData(pagination.page, pagination.limit);
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    }
  };

  const columns = [
    { header: "Tên Trường (fieldName)", accessor: "fieldName", width: "1.5fr" },
    {
      header: "Nhãn Hiển thị (fieldLabel)",
      accessor: "fieldLabel",
      width: "1.5fr",
    },
    { header: "Kiểu Dữ liệu", accessor: "fieldType", width: "1fr" },
    {
      header: "Chương trình",
      width: "1fr",
      cell: (item) => item.programIds?.length || 0,
    },
    {
      header: "Nguồn Dữ liệu",
      width: "1fr",
      cell: (item) => item.dataSourceIds?.length || 0,
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={fields}
          onRowClick={handleOpenPanel}
          onAddItem={() => handleOpenPanel(null)}
          onDeleteItem={handleDelete}
          showActions={true}
          activeRowId={activeFieldIds}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <PaginationControls pagination={pagination} onPageChange={fetchData} />
      </div>
    </div>
  );
}
