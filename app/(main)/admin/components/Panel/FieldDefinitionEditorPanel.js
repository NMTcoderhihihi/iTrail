// [ADD] app/(main)/admin/components/Panel/FieldDefinitionEditorPanel.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "./FieldDefinitionEditorPanel.module.css";
import LoadingSpinner from "../shared/LoadingSpinner";
import { getFieldDefinitionById } from "@/app/data/fieldDefinition/fieldDefinition.queries";
import { createOrUpdateFieldDefinition } from "@/app/data/fieldDefinition/fieldDefinition.actions";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { getDataSourcesForFilter } from "@/app/data/dataSource/dataSource.queries";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function FieldDefinitionEditorPanel({ fieldId, onSaveSuccess }) {
  const [field, setField] = useState({
    fieldName: "",
    fieldLabel: "",
    fieldType: "string",
    scope: "CUSTOMER",
    displayCondition: "ANY",
    programIds: [],
    dataSourceIds: [],
    tagIds: [],
  });
  const [allPrograms, setAllPrograms] = useState([]);
  const [allDataSources, setAllDataSources] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [programsResult, tagsResult, dataSourcesResult] = await Promise.all(
        [
          getCareProgramsForFilter(),
          getTagsForFilter(),
          getDataSourcesForFilter(),
        ],
      );

      setAllPrograms(programsResult || []);
      setAllTags(tagsResult || []);
      setAllDataSources(dataSourcesResult || []);

      if (fieldId) {
        const fieldResult = await getFieldDefinitionById(fieldId);
        if (fieldResult.success) {
          const fetchedField = fieldResult.data;
          setField({
            ...fetchedField,
            programIds: fetchedField.programIds || [],
            tagIds: fetchedField.tagIds || [],
            dataSourceIds: fetchedField.dataSourceIds || [],
          });
        } else {
          alert(`Lỗi tải dữ liệu trường: ${fieldResult.error}`);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [fieldId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setField((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name, selectedIds) => {
    let fullObjects = [];
    if (name === "programIds") {
      fullObjects = allPrograms.filter((p) => selectedIds.includes(p._id));
    } else if (name === "dataSourceIds") {
      fullObjects = allDataSources.filter((ds) => selectedIds.includes(ds._id));
    } else {
      // tagIds đã là mảng ID chuỗi sẵn, giữ nguyên
      fullObjects = selectedIds;
    }

    setField((prev) => ({
      ...prev,
      [name]: fullObjects,
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      // [MOD] Trước khi lưu, chuyển đổi lại mảng object về mảng ID
      const dataToSave = {
        ...field,
        programIds: field.programIds.map((p) => p._id),
        dataSourceIds: field.dataSourceIds.map((ds) => ds._id),
        // tagIds đã là mảng ID sẵn rồi
      };

      const result = await createOrUpdateFieldDefinition({
        id: fieldId,
        ...dataToSave,
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

        {/* [ADD] Thêm các trường cấu hình mới */}
        <div className={styles.formGroup}>
          <label>Phạm vi (Scope)</label>
          <select name="scope" value={field.scope} onChange={handleInputChange}>
            <option value="CUSTOMER">Chung cho Khách hàng</option>
            <option value="PROGRAM">Riêng cho Chương trình</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Điều kiện hiển thị</label>
          <select
            name="displayCondition"
            value={field.displayCondition}
            onChange={handleInputChange}
          >
            <option value="ANY">
              Khớp BẤT KỲ Tag hoặc Chương trình nào (OR)
            </option>
            <option value="ALL">Khớp TẤT CẢ Tags và Chương trình (AND)</option>
          </select>
        </div>

        {/* [FIX] Chuyển đổi mảng object thành mảng ID trước khi truyền vào prop */}
        <MultiSelectDropdown
          label="Gán cho Chương trình CS"
          options={allPrograms.map((p) => ({ id: p._id, name: p.name }))}
          selectedIds={(field.programIds || []).map((p) => p._id)}
          onChange={(ids) => handleMultiSelectChange("programIds", ids)}
          displayAs="chip"
        />
        <MultiSelectDropdown
          label="Gán cho Tags (Trường chung)"
          options={allTags.map((t) => ({ id: t._id, name: t.name }))}
          selectedIds={field.tagIds}
          onChange={(ids) => handleMultiSelectChange("tagIds", ids)}
          displayAs="chip"
        />
        <MultiSelectDropdown
          label="Lấy từ Nguồn Dữ liệu (ưu tiên từ trên xuống)"
          options={allDataSources.map((ds) => ({ id: ds._id, name: ds.name }))}
          selectedIds={(field.dataSourceIds || []).map((ds) => ds._id)}
          onChange={(ids) => handleMultiSelectChange("dataSourceIds", ids)}
          displayAs="list"
        />
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
