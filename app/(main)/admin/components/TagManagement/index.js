// [ADD] app/(main)/admin/components/TagManagement/index.js
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePanels } from "@/contexts/PanelContext";
import { getTagsForFilter } from "@/app/data/tag/tag.queries"; // Using existing query
import { createOrUpdateTag, deleteTag } from "@/app/data/tag/tag.action";
import LoadingSpinner from "../shared/LoadingSpinner";
import DataTable from "../datatable/DataTable";
import TagEditorPanel from "../Panel/TagEditorPanel";
// [NOTE] This component doesn't need pagination for now as tags are few.

export default function TagManagement() {
  const { openPanel, closePanel, allActivePanels } = usePanels();
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeTagIds = useMemo(() => {
    return (allActivePanels || [])
      .filter((panel) => panel.id.startsWith("tag-editor-"))
      .map((panel) => panel.id.replace("tag-editor-", ""));
  }, [allActivePanels]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await getTagsForFilter(); // No pagination needed for now
    // The result from this query is the array directly
    setTags(result || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPanel = (tag = null) => {
    const panelId = `tag-editor-${tag?._id || "new"}`;
    openPanel({
      id: panelId,
      title: tag ? `Chỉnh sửa Tag: ${tag.name}` : "Tạo Tag Mới",
      component: TagEditorPanel,
      props: {
        initialData: tag,
        onSaveSuccess: () => {
          fetchData();
          closePanel(panelId);
        },
      },
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa Tag này không?")) {
      const result = await deleteTag(id);
      if (result.success) {
        fetchData();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    }
  };

  const columns = [
    { header: "Tên Tag", accessor: "name", width: "1.5fr" },
    { header: "Mô tả", accessor: "detail", width: "3fr" },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={tags}
          onRowClick={handleOpenPanel}
          onAddItem={() => handleOpenPanel(null)}
          onDeleteItem={handleDelete}
          showActions={true}
          activeRowId={activeTagIds}
        />
      </div>
      {/* No pagination needed for now */}
    </div>
  );
}
