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
    } else {
      // [ADD] Thêm log lỗi để dễ debug
      console.error("Failed to fetch field definitions:", result.error);
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
      header: "Chương trình & Tags",
      width: "2fr", // Tăng độ rộng
      cell: (item) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {/* [FIX] Sửa lại logic cell để đọc từ 'programs' và 'tags' */}
          {(item.programs || []).map((program) => (
            <span key={program._id} className="program-chip">
              {program.name}
            </span>
          ))}
          {(item.tags || []).map((tag) => (
            <span key={tag._id} className="tag-chip">
              {tag.name}
            </span>
          ))}
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style jsx global>{`
        .program-chip {
          background-color: #eef2ff;
          color: #4338ca;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }
        .tag-chip {
          background-color: #f0fdf4;
          color: #166534;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }
      `}</style>
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
