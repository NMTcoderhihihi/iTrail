// [ADD] app/(main)/admin/components/Panel/CareProgramEditorPanel.js
"use client";

import React, { useState, useTransition } from "react";
import styles from "./CareProgramEditorPanel.module.css";
import {
  createCareProgram,
  updateCareProgram, // [ADD] Import action mới
  addStatusToProgram,
  updateStatusInProgram,
  deleteStatusFromProgram,
  addStageToProgram,
  updateStageInProgram,
  deleteStageFromProgram,
} from "@/app/data/careProgram/careProgram.actions";
import { Svg_Plus, Svg_Trash, Svg_Edit } from "@/components/(icon)/svg";

// [MOD] Nâng cấp toàn bộ component con
const SubEntityManager = ({ title, items, onSave, onDelete }) => {
  const [editingItem, setEditingItem] = useState(null); // {id, name, description, level}
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = (itemToSave) => {
    if (!itemToSave.name) return;
    onSave(itemToSave);
    setEditingItem(null);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingItem(null);
    setIsAdding(false);
  };

  const handleDelete = (itemId) => {
    if (confirm("Bạn có chắc chắn muốn xóa mục này không?")) {
      onDelete(itemId);
    }
  };

  const renderItem = (item) => {
    const isEditing = editingItem && editingItem._id === item._id;
    if (isEditing) {
      return (
        <EditableItemForm
          key={item._id}
          item={editingItem}
          setItem={setEditingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isStage={!!item.level}
        />
      );
    }
    return (
      <div key={item._id} className={styles.subItem}>
        <div
          className={styles.subItemInfo}
          onClick={() => setEditingItem(item)}
          style={{ cursor: "pointer" }}
        >
          <span className={styles.subItemName}>
            {item.level ? `Cấp ${item.level}: ${item.name}` : item.name}
          </span>
          <span className={styles.subItemDesc}>{item.description}</span>
        </div>
        <div className={styles.subItemActions}>
          {/* [DEL] Nút Sửa đã bị loại bỏ */}
          <button
            type="button"
            className={styles.subDeleteButton}
            onClick={() => handleDelete(item._id)}
          >
            <Svg_Trash w={14} h={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.subManager}>
      <div className={styles.subManagerHeader}>
        <h5 className={styles.subManagerTitle}>
          {title} ({items.length})
        </h5>
        {!isAdding && !editingItem && (
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
        {(items || []).map(renderItem)}
        {isAdding && (
          <EditableItemForm
            isStage={title.includes("Giai đoạn")}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

// [ADD] Component form con để Thêm/Sửa
const EditableItemForm = ({
  item = { name: "", description: "", level: 1 },
  setItem,
  onSave,
  onCancel,
  isStage,
}) => {
  const [localItem, setLocalItem] = useState(item);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const val = name === "level" ? parseInt(value, 10) : value;
    if (setItem) {
      // Chế độ sửa
      setItem((prev) => ({ ...prev, [name]: val }));
    } else {
      // Chế độ thêm mới
      setLocalItem((prev) => ({ ...prev, [name]: val }));
    }
  };

  const currentItem = setItem ? item : localItem;

  return (
    <div className={styles.subAddItemForm}>
      <input
        name="name"
        type="text"
        placeholder="Tên..."
        value={currentItem.name}
        onChange={handleChange}
      />
      {isStage && (
        <input
          name="level"
          type="number"
          placeholder="Cấp"
          value={currentItem.level}
          min="1"
          onChange={handleChange}
        />
      )}
      <input
        name="description"
        type="text"
        placeholder="Mô tả (không bắt buộc)..."
        value={currentItem.description}
        onChange={handleChange}
      />
      <div className={styles.subAddItemActions}>
        <button type="button" onClick={onCancel}>
          Hủy
        </button>
        <button type="button" onClick={() => onSave(currentItem)}>
          Lưu
        </button>
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

  const handleSaveProgram = () => {
    startTransition(async () => {
      const action = program._id ? updateCareProgram : createCareProgram;
      const data = {
        name: program.name,
        description: program.description,
        isActive: program.isActive,
      };

      const result = await action(program._id, data);

      if (result.success) {
        onSaveSuccess();
        // Chỉ đóng panel khi tạo mới thành công
        if (!program._id) {
          closePanel();
        }
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  const handleSaveStage = (stageData) => {
    if (!program._id) return alert("Vui lòng lưu chương trình trước.");
    startTransition(async () => {
      const action = stageData._id ? updateStageInProgram : addStageToProgram;
      const result = await action(program._id, stageData._id, stageData);
      if (result.success) onSaveSuccess();
      else alert(`Lỗi: ${result.error}`);
    });
  };

  // [MOD] Hợp nhất logic onSave cho Status
  const handleSaveStatus = (statusData) => {
    if (!program._id) return alert("Vui lòng lưu chương trình trước.");
    startTransition(async () => {
      const action = statusData._id
        ? updateStatusInProgram
        : addStatusToProgram;
      const result = await action(program._id, statusData._id, statusData);
      if (result.success) onSaveSuccess();
      else alert(`Lỗi: ${result.error}`);
    });
  };

  // [ADD] Hàm xử lý xóa Status
  const handleDeleteStatus = (statusId) => {
    if (!program._id) return;
    startTransition(async () => {
      const result = await deleteStatusFromProgram(program._id, statusId);
      if (result.success) {
        onSaveSuccess();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  // [ADD] Hàm xử lý xóa Stage
  const handleDeleteStage = (stageId) => {
    if (!program._id) return;
    startTransition(async () => {
      const result = await deleteStageFromProgram(program._id, stageId);
      if (result.success) {
        onSaveSuccess();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
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
          onSave={handleSaveStage}
          onDelete={handleDeleteStage}
        />
        <SubEntityManager
          title="Trạng thái (Statuses)"
          items={program.statuses}
          onSave={handleSaveStatus}
          onDelete={handleDeleteStatus}
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
          onClick={handleSaveProgram}
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
