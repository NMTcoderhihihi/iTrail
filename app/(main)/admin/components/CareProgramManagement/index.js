// [ADD] app/(main)/admin/components/CareProgramManagement/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePanels } from "@/contexts/PanelContext";
import { getCarePrograms } from "@/app/data/careProgram/careProgram.queries";
import { createCareProgram } from "@/app/data/careProgram/careProgram.actions";
import LoadingSpinner from "../shared/LoadingSpinner";
import PaginationControls from "../shared/PaginationControls";
import DataTable from "../datatable/DataTable";
import CareProgramEditorPanel from "../Panel/CareProgramEditorPanel";

export default function CareProgramManagement() {
  const { openPanel, closePanel, allActivePanels } = usePanels();
  const [programs, setPrograms] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const activeProgramIds = useMemo(() => {
    return (allActivePanels || [])
      .filter((panel) => panel.id.startsWith("care-program-"))
      .map((panel) => panel.id.replace("care-program-", ""));
  }, [allActivePanels]);

  const fetchData = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    const result = await getCarePrograms({ page, limit });
    if (result.success) {
      setPrograms(result.data);
      setPagination(result.pagination);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPanel = (program = null) => {
    const panelId = `care-program-${program?._id || "new"}`;
    openPanel({
      id: panelId,
      title: program ? `Chỉnh sửa: ${program.name}` : "Tạo Chương trình Mới",
      component: CareProgramEditorPanel,
      props: {
        programData: program,
        onSaveSuccess: () => {
          fetchData(pagination.page, pagination.limit);
          closePanel(panelId);
        },
        closePanel: () => closePanel(panelId),
      },
    });
  };

  const columns = [
    { header: "Tên Chương trình", accessor: "name", width: "2fr" },
    { header: "Mô tả", accessor: "description", width: "3fr" },
    {
      header: "Số Giai đoạn",
      width: "1fr",
      cell: (item) => item.stages?.length || 0,
    },
    {
      header: "Số Trạng thái",
      width: "1fr",
      cell: (item) => item.statuses?.length || 0,
    },
    {
      header: "Active",
      width: "0.5fr",
      cell: (item) => (item.isActive ? "✅" : "❌"),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={programs}
          onRowClick={handleOpenPanel}
          onAddItem={() => handleOpenPanel(null)}
          onDeleteItem={(id) =>
            alert(`Chức năng xóa cho ${id} sẽ được phát triển sau.`)
          }
          showActions={true}
          activeRowId={activeProgramIds}
        />
      </div>
      <div style={{ flexShrink: 0 }}>
        <PaginationControls pagination={pagination} onPageChange={fetchData} />
      </div>
    </div>
  );
}
