// [ADD] app/(main)/client/ui/table/CustomerTable.js

import React, { useMemo } from "react";
import styles from "./CustomerTable.module.css";
import UidStatusCell from "./UidStatusCell";
import StageIndicator from "@/components/(ui)/progress/StageIndicator";

// Component con cho các hàng dữ liệu
const Row = React.memo(
  ({
    customer,
    columns,
    zaloAccounts,
    onRowClick,
    isSelected,
    onToggleSelect,
  }) => (
    <div
      className={`${styles.gridRow} ${isSelected ? styles.activeRow : ""}`}
      onClick={() => onRowClick(customer)}
    >
      {/* Checkbox cell */}
      <div className={styles.cell} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className={styles.bigCheckbox}
          checked={isSelected}
          onChange={() => onToggleSelect(customer._id)}
        />
      </div>
      {/* Data cells */}
      {columns.slice(1).map((col) => (
        <div key={col.key} className={styles.cell}>
          {col.render(customer, zaloAccounts)}
        </div>
      ))}
    </div>
  ),
);

// Component chính
export default function CustomerTable({
  customers = [],
  zaloAccounts = [],
  pagination,
  currentProgram, // Nhận vào chương trình hiện tại (hoặc null)
  onRowClick,
  selectedIds,
  onToggleSelect,
  onTogglePage,
}) {
  // Logic định nghĩa các cột hiển thị
  const columns = useMemo(() => {
    // [ADD] Lấy ra các giá trị pagination an toàn ở đầu
    const currentPage = pagination?.page || 1;
    const currentLimit = pagination?.limit || 10;

    const baseColumns = [
      {
        key: "checkbox",
        label: (
          <input
            type="checkbox"
            onChange={onTogglePage}
            checked={
              customers.length > 0 && selectedIds.size === customers.length
            }
            className={styles.bigCheckbox}
          />
        ),
        width: "40px",
      },
      {
        key: "stt",
        label: "STT",
        width: "50px",
        render: (c, za, index) => (currentPage - 1) * currentLimit + index + 1,
      },
      {
        key: "phone",
        label: "Di động",
        width: "120px",
        render: (c) => c.phone,
      },
      { key: "name", label: "Tên", width: "1.5fr", render: (c) => c.name },
      {
        key: "citizenId",
        label: "CCCD",
        width: "120px",
        render: (c) => c.citizenId || "-",
      },
      {
        key: "uid",
        label: "UID Status",
        width: "1fr",
        render: (c, za) => <UidStatusCell uidData={c.uid} zaloAccounts={za} />,
      },
      {
        key: "action",
        label: "Action",
        width: "120px",
        render: (c) => (c.action?.length > 0 ? "Running" : "-"),
      },
    ];

    if (currentProgram) {
      // Nếu ở tab chương trình, thêm các cột chuyên biệt
      return [
        ...baseColumns,
        {
          key: "dataStatus",
          label: "Data Status",
          width: "1fr",
          render: (c) => c.programEnrollments?.[0]?.dataStatus || "-",
        },
        {
          key: "stage",
          label: "Giai đoạn",
          width: "1fr",
          render: (c) => <StageIndicator level={c.stage?.level || 0} />,
        },
        {
          key: "status",
          label: "Trạng thái",
          width: "1.5fr",
          render: (c) => c.status?.name || "-",
        },
      ];
    }

    // Mặc định là cột cho tab "Tất cả"
    return baseColumns;
  }, [
    currentProgram,
    onTogglePage,
    customers.length,
    selectedIds.size,
    pagination,
  ]);

  const gridTemplateColumns = columns.map((c) => c.width).join(" ");

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.gridContainer} style={{ gridTemplateColumns }}>
        {/* Header */}
        <div className={styles.header}>
          {columns.map((col) => (
            <div key={col.key} className={styles.headerCell}>
              {col.label}
            </div>
          ))}
        </div>
        {/* Body */}
        {customers.map((customer, index) => (
          <Row
            key={customer._id}
            customer={customer}
            columns={columns}
            zaloAccounts={zaloAccounts}
            onRowClick={onRowClick}
            isSelected={selectedIds.has(customer._id)}
            onToggleSelect={onToggleSelect}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
