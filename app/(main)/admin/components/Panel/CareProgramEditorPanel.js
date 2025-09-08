// [ADD] app/(main)/admin/components/Panel/CareProgramEditorPanel.js
"use client";

import React, { useState, useTransition } from "react";
import styles from "./CareProgramEditorPanel.module.css";
import {
  createCareProgram,
  addStatusToProgram,
  addStageToProgram,
} from "@/app/data/careProgram/careProgram.actions";
import { Svg_Plus, Svg_Trash } from "@/components/(icon)/svg";

// Component con để quản lý một danh sách (Stages hoặc Statuses)
const SubEntityManager = ({ title, items, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    level: 1,
  });

  const handleAdd = () => {
    if (!newItem.name) return;
    onAdd(newItem);
    setNewItem({ name: "", description: "", level: 1 });
    setIsAdding(false);
  };

  return (
    <div className={styles.subManager}>
      <div className={styles.subManagerHeader}>
        <h5 className={styles.subManagerTitle}>{title}</h5>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className={styles.subAddButton}
          >
            <Svg_Plus w={16} h={16} /> Thêm
          </button>
        )}
      </div>
      <div className={styles.subManagerList}>
        {(items || []).map((item, index) => (
          <div key={item._id || index} className={styles.subItem}>
            <div className={styles.subItemInfo}>
              <span className={styles.subItemName}>
                {item.level ? `Cấp ${item.level}: ${item.name}` : item.name}
              </span>
              <span className={styles.subItemDesc}>{item.description}</span>
            </div>
            <button type="button" className={styles.subDeleteButton}>
              <Svg_Trash w={14} h={14} />
            </button>
          </div>
        ))}
        {isAdding && (
          <div className={styles.subAddItemForm}>
            <input
              type="text"
              placeholder="Tên..."
              value={newItem.name}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            {title === "Giai đoạn (Stages)" && (
              <input
                type="number"
                placeholder="Cấp"
                value={newItem.level}
                min="1"
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    level: parseInt(e.target.value, 10),
                  }))
                }
              />
            )}
            <input
              type="text"
              placeholder="Mô tả..."
              value={newItem.description}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, description: e.target.value }))
              }
            />
            <div className={styles.subAddItemActions}>
              <button type="button" onClick={() => setIsAdding(false)}>
                Hủy
              </button>
              <button type="button" onClick={handleAdd}>
                Lưu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function CareProgramEditorPanel({
  programData,
  onSaveSuccess,
  closePanel,
}) {
  const [program, setProgram] = useState(
    programData || {
      name: "",
      description: "",
      isActive: true,
      stages: [],
      statuses: [],
    },
  );
  const [isPending, startTransition] = useTransition();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProgram((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      // Tạm thời chỉ hỗ trợ tạo mới
      if (!program._id) {
        const result = await createCareProgram({
          name: program.name,
          description: program.description,
          isActive: program.isActive,
        });
        if (result.success) {
          onSaveSuccess();
        } else {
          alert(`Lỗi: ${result.error}`);
        }
      } else {
        alert("Chức năng cập nhật sẽ được phát triển sau.");
      }
    });
  };

  const handleAddStage = (stageData) => {
    if (!program._id)
      return alert("Vui lòng lưu chương trình trước khi thêm giai đoạn.");
    startTransition(async () => {
      const result = await addStageToProgram(program._id, stageData);
      if (result.success) onSaveSuccess();
    });
  };

  const handleAddStatus = (statusData) => {
    if (!program._id)
      return alert("Vui lòng lưu chương trình trước khi thêm trạng thái.");
    startTransition(async () => {
      const result = await addStatusToProgram(program._id, statusData);
      if (result.success) onSaveSuccess();
    });
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelBody}>
        <div className={styles.formGroup}>
          <label>Tên Chương trình</label>
          <input
            name="name"
            value={program.name}
            onChange={handleInputChange}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Mô tả</label>
          <textarea
            name="description"
            value={program.description}
            onChange={handleInputChange}
            rows={3}
          ></textarea>
        </div>
        <div className={styles.formGroupRow}>
          <input
            type="checkbox"
            name="isActive"
            checked={program.isActive}
            onChange={handleInputChange}
            id="isActiveCheckbox"
          />
          <label htmlFor="isActiveCheckbox">Kích hoạt</label>
        </div>

        <SubEntityManager
          title="Giai đoạn (Stages)"
          items={program.stages}
          onAdd={handleAddStage}
        />
        <SubEntityManager
          title="Trạng thái (Statuses)"
          items={program.statuses}
          onAdd={handleAddStatus}
        />
      </div>

      <div className={styles.panelFooter}>
        <button
          className={styles.cancelButton}
          onClick={closePanel}
          disabled={isPending}
        >
          Hủy
        </button>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending
            ? "Đang lưu..."
            : program._id
            ? "Lưu thay đổi"
            : "Tạo chương trình"}
        </button>
      </div>
    </div>
  );
}
