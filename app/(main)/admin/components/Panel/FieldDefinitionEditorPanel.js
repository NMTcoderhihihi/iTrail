// [ADD] app/(main)/admin/components/Panel/FieldDefinitionEditorPanel.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "./FieldDefinitionEditorPanel.module.css";
import LoadingSpinner from "../shared/LoadingSpinner";
import { getFieldDefinitions } from "@/app/data/fieldDefinition/fieldDefinition.queries";
import { createOrUpdateFieldDefinition } from "@/app/data/fieldDefinition/fieldDefinition.actions";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries"; // [ADD]
import MultiSelect from "./MultiSelect";

export default function FieldDefinitionEditorPanel({ fieldId, onSaveSuccess }) {
  const [field, setField] = useState({
    fieldName: "",
    fieldLabel: "",
    fieldType: "string",
    programIds: [],
    dataSourceIds: [],
    tagIds: [], // [ADD]
  });
  const [allPrograms, setAllPrograms] = useState([]);
  const [allDataSources, setAllDataSources] = useState([]);
  const [allTags, setAllTags] = useState([]); // [ADD]
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Tải song song tất cả dữ liệu cần thiết
    Promise.all([
      fieldId
        ? getFieldDefinitions({ _id: fieldId })
        : Promise.resolve({ data: [null] }),
      getCareProgramsForFilter(),
      // getDataSources({ limit: 0 }), // Tạm thời bỏ để tránh lỗi
      getTagsForFilter(), // [ADD]
    ]).then(([fieldResult, programsResult, tagsResult]) => {
      // [MOD]
      if (fieldResult.data[0]) setField(fieldResult.data[0]);
      setAllPrograms(programsResult || []);
      // setAllDataSources(dataSourcesResult.data || []);
      setAllTags(tagsResult || []); // [ADD]
      setIsLoading(false);
    });
  }, [fieldId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setField((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name, selectedIds) => {
    setField((prev) => ({ ...prev, [name]: selectedIds }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await createOrUpdateFieldDefinition({
        id: fieldId,
        ...field,
      });
      if (result.success) {
        onSaveSuccess();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelBody}>
        <div className={styles.formGroup}>
          <label>Tên Trường (fieldName)</label>
          <input
            name="fieldName"
            value={field.fieldName}
            onChange={handleInputChange}
            placeholder="vd: tong_diem_xt"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Nhãn Hiển thị (fieldLabel)</label>
          <input
            name="fieldLabel"
            value={field.fieldLabel}
            onChange={handleInputChange}
            placeholder="vd: Tổng Điểm Xét Tuyển"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Kiểu Dữ liệu</label>
          <select
            name="fieldType"
            value={field.fieldType}
            onChange={handleInputChange}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Boolean</option>
            <option value="objectId">ObjectId</option>
          </select>
        </div>

        <MultiSelect
          label="Gán cho Chương trình CS"
          options={allPrograms.map((p) => ({ id: p._id, name: p.name }))}
          selectedIds={field.programIds || []}
          onChange={(ids) => handleMultiSelectChange("programIds", ids)}
        />

        <MultiSelect
          label="Gán cho Tags (Trường chung)"
          options={allTags.map((t) => ({ id: t._id, name: t.name }))}
          selectedIds={field.tagIds || []}
          onChange={(ids) => handleMultiSelectChange("tagIds", ids)}
        />

        {/* <MultiSelect
          label="Lấy từ Nguồn Dữ liệu"
          options={allDataSources.map((ds) => ({ id: ds._id, name: ds.name }))}
          selectedIds={field.dataSourceIds || []}
          onChange={(ids) => handleMultiSelectChange("dataSourceIds", ids)}
        /> */}
      </div>
      <div className={styles.panelFooter}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Đang lưu..." : "Lưu Trường Dữ liệu"}
        </button>
      </div>
    </div>
  );
}
