// [MOD] app/(main)/client/ui/panel/AssignProgramPanel.js
"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import styles from "./AssignPanel.module.css"; // [MOD] Sử dụng file CSS chung
import Loading from "@/components/(ui)/(loading)/loading";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { enrollCustomersInProgram } from "@/app/data/customer/customer.actions";
import { usePanels } from "@/contexts/PanelContext";

export default function AssignProgramPanel({
  customerIds,
  onAssignSuccess,
  user,
}) {
  const { closePanel } = usePanels();

  const [allPrograms, setAllPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getCareProgramsForFilter(user).then((programs) => {
      setAllPrograms(programs || []);
      setIsLoading(false);
    });
  }, [user]);

  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return allPrograms;
    return allPrograms.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allPrograms, searchTerm]);

  const selectedProgram = useMemo(() => {
    return allPrograms.find((p) => p._id === selectedProgramId);
  }, [allPrograms, selectedProgramId]);

  const handleAssign = () => {
    if (!selectedProgramId) {
      alert("Vui lòng chọn một chương trình chăm sóc.");
      return;
    }
    startTransition(async () => {
      const result = await enrollCustomersInProgram({
        customerIds,
        programId: selectedProgramId,
        stageId: selectedStageId,
        statusId: selectedStatusId,
      });

      if (result.success) {
        alert(
          `Gán thành công cho ${result.modifiedCount} khách hàng! (Lưu ý: Khách hàng đã ở trong chương trình sẽ được bỏ qua).`,
        );
        onAssignSuccess();
        closePanel();
      } else {
        alert(`Lỗi: ${result.error}`);
      }
    });
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={styles.panelContainer}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Tìm kiếm chương trình..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className={styles.listContainer}>
        {filteredPrograms.map((program) => {
          const isSelected = selectedProgramId === program._id;
          return (
            <div
              key={program._id}
              className={`${styles.listItem} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() => setSelectedProgramId(program._id)}
            >
              <input
                type="radio"
                name="program"
                checked={isSelected}
                readOnly
                className={styles.checkbox}
              />
              <div className={styles.listItemContent}>
                <span>{program.name}</span>
              </div>
            </div>
          );
        })}
      </div>
      {selectedProgram && (
        <div className={styles.subOptions}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Chọn Giai đoạn ban đầu (Tùy chọn)
            </label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Không chọn --</option>
              {(selectedProgram.stages || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (Cấp {s.level})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Chọn Trạng thái ban đầu (Tùy chọn)
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              className={styles.select}
            >
              <option value="">-- Không chọn --</option>
              {(selectedProgram.statuses || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className={styles.actions}>
        <button
          onClick={closePanel}
          className={`${styles.buttonBase} ${styles.ghostButton}`}
          disabled={isPending}
        >
          Hủy
        </button>
        <button
          onClick={handleAssign}
          className={`${styles.buttonBase} ${styles.blueButton}`}
          disabled={isPending || !selectedProgramId}
        >
          {isPending ? "Đang gán..." : "Gán Chương trình"}
        </button>
      </div>
    </div>
  );
}
