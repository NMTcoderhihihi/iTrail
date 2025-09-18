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
import { Svg_Plus, Svg_Trash } from "@/components/(icon)/svg";

// [ADD] Component con để quản lý một quy tắc hiển thị
const DisplayRule = ({
  rule,
  index,
  updateRule,
  removeRule,
  allTags,
  allPrograms,
}) => {
  const handleConditionChange = (key, value) => {
    const newConditions = { ...rule.conditions, [key]: value };
    updateRule(index, { ...rule, conditions: newConditions });
  };

  const handlePlacementChange = (e) => {
    updateRule(index, { ...rule, placement: e.target.value });
  };
  const requiredTagIds = (rule.conditions.requiredTags || []).map(
    (tag) => tag._id || tag,
  );
  const requiredProgramIds = (rule.conditions.requiredPrograms || []).map(
    (program) => program._id || program,
  );

  return (
    <div className={styles.ruleContainer}>
      <div className={styles.ruleHeader}>
        <span className={styles.ruleTitle}>Quy tắc #{index + 1}</span>
        <button
          type="button"
          onClick={() => removeRule(index)}
          className={styles.removeRuleBtn}
        >
          <Svg_Trash w={14} h={14} />
        </button>
      </div>
      <div className={styles.ruleBody}>
        <div className={styles.formGroup}>
          <label>Hiển thị tại</label>
          <select value={rule.placement} onChange={handlePlacementChange}>
            <option value="COMMON">Thông tin chung (Customer)</option>
            <option value="PROGRAM">Bên trong Chương trình</option>
          </select>
        </div>
        <div className={styles.conditionsBox}>
          <div
            className={styles.formGroup}
            style={{ border: "none", padding: 0 }}
          >
            <label>Khi các điều kiện sau được thỏa mãn</label>
            <select
              value={rule.conditions.operator}
              onChange={(e) =>
                handleConditionChange("operator", e.target.value)
              }
            >
              <option value="AND">Thỏa mãn TẤT CẢ (AND)</option>
              <option value="OR">Thỏa mãn BẤT KỲ (OR)</option>
            </select>
          </div>
          <MultiSelectDropdown
            label="Khách hàng phải có Tags"
            options={allTags.map((t) => ({ id: t._id, name: t.name }))}
            // [MOD] Truyền vào mảng ID đã được chuyển đổi
            selectedIds={requiredTagIds}
            onChange={(ids) => handleConditionChange("requiredTags", ids)}
            displayAs="chip"
          />
          <MultiSelectDropdown
            label="Khách hàng phải tham gia Programs"
            options={allPrograms.map((p) => ({ id: p._id, name: p.name }))}
            // [MOD] Truyền vào mảng ID đã được chuyển đổi
            selectedIds={requiredProgramIds}
            onChange={(ids) => handleConditionChange("requiredPrograms", ids)}
            displayAs="chip"
          />
        </div>
      </div>
    </div>
  );
};

export default function FieldDefinitionEditorPanel({ fieldId, onSaveSuccess }) {
  const [field, setField] = useState({
    fieldName: "",
    fieldLabel: "",
    fieldType: "string",
    dataSourceIds: [],
    displayRules: [],
  });
  const [allPrograms, setAllPrograms] = useState([]);
  const [allDataSources, setAllDataSources] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [programsResult, tagsResult] = await Promise.all([
        getCareProgramsForFilter(),
        getTagsForFilter(),
      ]);

      setAllPrograms(programsResult || []);
      setAllTags(tagsResult || []);

      if (fieldId) {
        const fieldResult = await getFieldDefinitionById(fieldId);
        if (fieldResult.success) {
          const fetchedField = fieldResult.data;
          setField({
            ...fetchedField,
            dataSourceIds: fetchedField.dataSourceIds || [],
            displayRules: fetchedField.displayRules || [],
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

  // --- [ADD] Các hàm quản lý displayRules ---
  const addRule = () => {
    const newRule = {
      placement: "COMMON",
      conditions: {
        operator: "AND",
        requiredTags: [],
        requiredPrograms: [],
      },
    };
    setField((prev) => ({
      ...prev,
      displayRules: [...prev.displayRules, newRule],
    }));
  };

  const updateRule = (index, updatedRule) => {
    const newRules = [...field.displayRules];
    newRules[index] = updatedRule;
    setField((prev) => ({ ...prev, displayRules: newRules }));
  };

  const removeRule = (index) => {
    const newRules = field.displayRules.filter((_, i) => i !== index);
    setField((prev) => ({ ...prev, displayRules: newRules }));
  };
  // --- Kết thúc hàm quản lý ---

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

        {/* [MOD] Giao diện quản lý Rules mới */}
        <div className={styles.rulesManagementSection}>
          <div className={styles.rulesHeader}>
            <h4>Quy tắc Hiển thị ({field.displayRules.length})</h4>
            <button
              type="button"
              onClick={addRule}
              className={styles.addRuleBtn}
            >
              <Svg_Plus w={16} h={16} /> Thêm Quy tắc
            </button>
          </div>
          <div className={styles.rulesList}>
            {field.displayRules.map((rule, index) => (
              <DisplayRule
                key={index}
                index={index}
                rule={rule}
                updateRule={updateRule}
                removeRule={removeRule}
                allTags={allTags}
                allPrograms={allPrograms}
              />
            ))}
            {field.displayRules.length === 0 && (
              <p className={styles.noRulesText}>
                Chưa có quy tắc nào. Trường này sẽ không hiển thị ở đâu.
              </p>
            )}
          </div>
        </div>
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
