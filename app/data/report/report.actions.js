// File: data/report/report.actions.js
"use server";

import connectDB from "@/config/connectDB";
import ReportLayout from "@/models/reportLayout";
import KpiResult from "@/models/kpiResult";
import { executeDataSource } from "../dataSource/dataSource.service";
import { revalidateAndBroadcast } from "@/lib/revalidation";
import { getCurrentUser } from "@/lib/session";

/**
 * Tạo mới hoặc cập nhật một layout báo cáo.
 */
export async function createOrUpdateReportLayout(data) {
  try {
    await connectDB();
    const { id, ...layoutData } = data;
    let result;
    if (id) {
      result = await ReportLayout.findByIdAndUpdate(id, layoutData, {
        new: true,
      });
    } else {
      result = await ReportLayout.create(layoutData);
    }
    revalidateAndBroadcast("report_layouts");
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một layout báo cáo.
 */
export async function deleteReportLayout(id) {
  try {
    await connectDB();
    await ReportLayout.findByIdAndDelete(id);
    revalidateAndBroadcast("report_layouts");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Thực thi một báo cáo, lấy dữ liệu từ các DataSource và ánh xạ kết quả.
 */
export async function executeReport({ layoutId, params }) {
  try {
    await connectDB();
    const layout = await ReportLayout.findById(layoutId).lean();
    if (!layout) throw new Error("Không tìm thấy layout báo cáo.");

    const reportData = {};

    for (const widget of layout.widgets) {
      const widgetDataSources = widget.dataSources || [];
      const dataSourcePromises = widgetDataSources.map((dsConfig) =>
        executeDataSource({
          dataSourceId: dsConfig.dataSourceId,
          params: { ...params, ...dsConfig.inputParams },
        }),
      );

      const results = await Promise.all(dataSourcePromises);

      const mappedData = {};
      for (const mapping of widget.dataMapping) {
        const sourceInfo = mapping.source;
        const dataSourceResult = results.find(
          (r, i) =>
            widgetDataSources[i].dataSourceId.toString() ===
            sourceInfo.dataSourceId.toString(),
        );

        if (dataSourceResult && !dataSourceResult.error) {
          // Giả sử kết quả là một mảng, ta sẽ map qua nó
          if (Array.isArray(dataSourceResult)) {
            mappedData[mapping.widgetParam] = dataSourceResult.map(
              (item) => item[sourceInfo.fieldName],
            );
          } else {
            mappedData[mapping.widgetParam] =
              dataSourceResult[sourceInfo.fieldName];
          }
        }
      }
      reportData[widget._id] = mappedData;
    }
    return { success: true, data: reportData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Lưu một "ảnh chụp nhanh" (snapshot) của kết quả báo cáo.
 */
export async function saveKpiResult(data) {
  try {
    await connectDB();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Yêu cầu đăng nhập.");

    const resultData = {
      ...data,
      exportedBy: currentUser.id,
    };

    const savedResult = await KpiResult.create(resultData);
    revalidateAndBroadcast("kpi_results");
    return { success: true, data: JSON.parse(JSON.stringify(savedResult)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
