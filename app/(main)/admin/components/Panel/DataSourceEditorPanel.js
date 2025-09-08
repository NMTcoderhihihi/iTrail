// [ADD] app/(main)/admin/components/Panel/DataSourceEditorPanel.js
"use client";

import React, { useState, useEffect, useTransition } from "react";
import styles from "./DataSourceEditorPanel.module.css";
// [FIX] Tách import: queries và actions ra 2 dòng riêng biệt
import { getDataSourceById } from "@/app/data/dataSource/dataSource.queries";
import { createOrUpdateDataSource } from "@/app/data/dataSource/dataSource.actions";
import LoadingSpinner from "../shared/LoadingSpinner";

// Component con để render form cấu hình động
const ConnectorConfigForm = ({ type, config, setConfig }) => {
  const handleParamChange = (index, key, value) => {
    const newParams = [...(config.params || [])];
    newParams[index] = { ...newParams[index], [key]: value };
    setConfig((prev) => ({ ...prev, params: newParams }));
  };

  const addParam = () => {
    const newParams = [...(config.params || []), { key: "", value: "" }];
    setConfig((prev) => ({ ...prev, params: newParams }));
  };

  if (type === "api" || type === "google_sheet") {
    return (
      <div className={styles.configBox}>
        <h5 className={styles.configTitle}>Tham số Kết nối</h5>
        {(config.params || []).map((param, index) => (
          <div key={index} className={styles.paramRow}>
            <input
              placeholder="Key (vd: url)"
              value={param.key}
              onChange={(e) => handleParamChange(index, "key", e.target.value)}
            />
            <input
              placeholder="Value"
              value={param.value}
              onChange={(e) =>
                handleParamChange(index, "value", e.target.value)
              }
            />
          </div>
        ))}
        <button type="button" onClick={addParam} className={styles.addButton}>
          + Thêm tham số
        </button>
      </div>
    );
  }

  if (type === "local_mongodb") {
    return (
      <div className={styles.configBox}>
        <h5 className={styles.configTitle}>
          MongoDB Aggregation Pipeline (JSON Array)
        </h5>
        <textarea
          placeholder='[&#10;  { "$match": { "status": "active" } },&#10;  { "$count": "total" }&#10;]'
          value={config.pipeline || ""}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, pipeline: e.target.value }))
          }
          rows={10}
        />
      </div>
    );
  }

  return null;
};

export default function DataSourceEditorPanel({ dataSourceId, onSaveSuccess }) {
  const [source, setSource] = useState({
    name: "",
    description: "",
    connectorType: "api",
    connectionConfig: { params: [] },
    databasePipeline: [],
  });
  const [isLoading, setIsLoading] = useState(!!dataSourceId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (dataSourceId) {
      getDataSourceById(dataSourceId).then((result) => {
        if (result.success) {
          // [FIX] Xử lý trường hợp pipeline là object thay vì string
          const fetchedSource = result.data;
          if (
            fetchedSource.connectorType === "local_mongodb" &&
            Array.isArray(fetchedSource.databasePipeline)
          ) {
            fetchedSource.connectionConfig = {
              ...fetchedSource.connectionConfig,
              pipeline: JSON.stringify(fetchedSource.databasePipeline, null, 2),
            };
          }
          setSource(fetchedSource);
        }
        setIsLoading(false);
      });
    }
  }, [dataSourceId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSource((prev) => ({ ...prev, [name]: value }));
  };

  const setConnectionConfig = (updater) => {
    setSource((prev) => ({
      ...prev,
      connectionConfig:
        typeof updater === "function"
          ? updater(prev.connectionConfig || {})
          : updater,
    }));
  };

  const handleSave = () => {
    let dataToSave = { ...source };

    // Xử lý pipeline JSON
    if (
      dataToSave.connectorType === "local_mongodb" &&
      typeof dataToSave.connectionConfig.pipeline === "string"
    ) {
      try {
        dataToSave.databasePipeline = JSON.parse(
          dataToSave.connectionConfig.pipeline,
        );
        delete dataToSave.connectionConfig; // Xóa config thừa
      } catch (e) {
        alert("Lỗi: Chuỗi JSON cho Pipeline không hợp lệ.");
        return;
      }
    } else {
      dataToSave.databasePipeline = null;
    }

    startTransition(async () => {
      const result = await createOrUpdateDataSource({
        id: dataSourceId,
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
          <label>Tên Nguồn Dữ liệu (duy nhất, không dấu, viết liền)</label>
          <input
            name="name"
            value={source.name}
            onChange={handleInputChange}
            placeholder="vd: DS_Get_All_Users"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Mô tả</label>
          <textarea
            name="description"
            value={source.description}
            onChange={handleInputChange}
            rows={3}
          ></textarea>
        </div>
        <div className={styles.formGroup}>
          <label>Loại Kết nối</label>
          <select
            name="connectorType"
            value={source.connectorType}
            onChange={handleInputChange}
          >
            <option value="api">API</option>
            <option value="google_sheet">Google Sheet</option>
            <option value="local_mongodb">Local MongoDB</option>
          </select>
        </div>

        <ConnectorConfigForm
          type={source.connectorType}
          config={source.connectionConfig || {}}
          setConfig={setConnectionConfig}
        />
        {/* TODO: Add UI for inputParams and outputSchema */}
      </div>
      <div className={styles.panelFooter}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Đang lưu..." : "Lưu Nguồn Dữ liệu"}
        </button>
      </div>
    </div>
  );
}
