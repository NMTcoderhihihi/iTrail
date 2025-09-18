// ++ MODIFIED: Hoàn thiện toàn bộ file service với logic xử lý pipeline và ghi dữ liệu
"use server";

import connectDB from "@/config/connectDB";
import DataSource from "@/models/dataSource";
import Customer from "@/models/customer";
import { google } from "googleapis";
import mongoose from "mongoose";

// --- THƯ VIỆN CÁC HÀM XỬ LÝ NGUYÊN THỦY ---
const processingFunctions = {
  /**
   * Chuẩn hóa số điện thoại về định dạng 10 số bắt đầu bằng 0.
   * @param {Array<object>} data - Dữ liệu thô.
   * @param {object} params - Tham số, ví dụ: { phoneField: 'DienThoai' }.
   * @returns {Array<object>} Dữ liệu đã được xử lý.
   */
  normalize_phone: (data, params) => {
    const { phoneField } = params;
    if (!phoneField) return data;
    return data.map((item) => {
      let phone = item[phoneField]?.toString().replace(/\s+/g, "");
      if (phone) {
        if (phone.startsWith("84")) phone = "0" + phone.substring(2);
        if (phone.length === 9 && !phone.startsWith("0")) phone = "0" + phone;
        item[phoneField] =
          phone.length === 10 && phone.startsWith("0") ? phone : null;
      }
      return item;
    });
  },
  // Thêm các hàm xử lý khác ở đây...
};

// --- CÁC HÀM NGUYÊN THỦY (CONNECTORS) ---

/**
 * Hàm đệ quy để thay thế placeholders trong một đối tượng bất kỳ.
 */
function replacePlaceholders(obj, params) {
  if (obj === null) return null;
  if (typeof obj !== "object") {
    if (typeof obj === "string" && obj.startsWith("$$")) {
      const paramKey = obj.substring(2);
      const value = params[paramKey];
      return value !== undefined ? value : obj;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => replacePlaceholders(item, params));
  }

  const newObj = {};
  for (const key in obj) {
    newObj[key] = replacePlaceholders(obj[key], params);
  }
  return newObj;
}

async function executeApiDataSource(config, params) {
  if (!config) {
    throw new Error("DataSource có kiểu 'api' nhưng thiếu 'connectionConfig'.");
  }

  const configParams = new Map(
    (config.params || []).map((p) => [p.key, p.value]),
  );
  const urlString = configParams.get("url");
  const method = configParams.get("method")?.toUpperCase() || "GET";
  const headers = JSON.parse(configParams.get("headers") || "{}");

  if (!urlString) throw new Error("URL is not defined in connectionConfig.");

  // Thay thế placeholder trong URL, headers và body
  const finalUrl = new URL(replacePlaceholders(urlString, params));
  const finalHeaders = replacePlaceholders(headers, params);

  const bodyParams = {};
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    // Nếu là GET, tất cả params vào URL. Nếu là POST, chỉ param nào có trong URL placeholder mới vào URL.
    if (method === "GET" || urlString.includes(`$$${key}`)) {
      // Gán vào URL search params nếu không phải là placeholder
      if (!urlString.includes(`$$${key}`)) {
        urlParams.set(key, value);
      }
    } else {
      bodyParams[key] = value;
    }
  });

  // Gắn các urlParams vào URL
  finalUrl.search = urlParams.toString();

  const fetchOptions = {
    method,
    headers: { "Content-Type": "application/json", ...finalHeaders },
    cache: "no-store",
  };

  // [MOD] Chỉ thêm body nếu là POST và có dữ liệu
  if (method === "POST" && Object.keys(bodyParams).length > 0) {
    fetchOptions.body = JSON.stringify(replacePlaceholders(bodyParams, params));
  }

  console.log("[DataSource Service] Sending request to:", finalUrl.toString());
  console.log("[DataSource Service] With options:", fetchOptions);

  const response = await fetch(finalUrl.toString(), fetchOptions);
  const responseData = await response.json();

  console.log("[DataSource Service] Raw API response:", responseData);

  if (!response.ok) {
    // [MOD] Ném lỗi từ dữ liệu đã đọc thay vì đọc lại
    const errorText = JSON.stringify(responseData);
    throw new Error(`API call failed: ${response.status} ${errorText}`);
  }

  // [MOD] Tự động "giải nén" nếu có thuộc tính 'data' và nó là một mảng
  if (responseData && Array.isArray(responseData.data)) {
    console.log("[DataSource Service] Unpacked .data property from response.");
    return responseData.data;
  }

  return responseData;
}

async function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function readFromGoogleSheet(config) {
  const configParams = new Map(
    (config.params || []).map((p) => [p.key, p.value]),
  );
  const spreadsheetId = configParams.get("spreadsheetId");
  const range = configParams.get("range");
  if (!spreadsheetId || !range)
    throw new Error("spreadsheetId and range are required for Google Sheet.");

  const sheets = google.sheets({ version: "v4", auth: await getGoogleAuth() });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0];
  const rawJsonData = rows.slice(1).map((row) =>
    headers.reduce((obj, header, index) => {
      obj[header] = row[index];
      return obj;
    }, {}),
  );

  // [ADD] Tự động chuẩn hóa số điện thoại nếu có cột 'sdt'
  if (headers.includes("sdt")) {
    return processingFunctions.normalize_phone(rawJsonData, {
      phoneField: "sdt",
    });
  }

  return rawJsonData;
}

async function executeMongoDbDataSource(pipeline, params) {
  if (!pipeline || !Array.isArray(pipeline))
    throw new Error("databasePipeline is invalid.");
  const finalPipeline = replacePlaceholders(pipeline, params);
  return await Customer.aggregate(finalPipeline);
}

/**
 * Bộ não thực thi một DataSource bất kỳ, có kèm theo bước xử lý dữ liệu.
 */
export async function executeDataSource({ dataSourceId, params = {} }) {
  try {
    await connectDB();
    const dataSource = await DataSource.findById(dataSourceId).lean();

    if (!dataSource) {
      throw new Error(`DataSource not found with ID: ${dataSourceId}`);
    }

    const finalParams = {};
    if (dataSource.inputParams && dataSource.inputParams.length > 0) {
      for (const inputDef of dataSource.inputParams) {
        if (inputDef.paramName === "id" && params.phone) {
          finalParams.id = params.phone;
        } else if (params[inputDef.paramName]) {
          finalParams[inputDef.paramName] = params[inputDef.paramName];
        }
      }
    } else {
      // Nếu không có định nghĩa input, cứ dùng params gốc
      Object.assign(finalParams, params);
    }

    // GIAI ĐOẠN 2: FETCH - Lấy dữ liệu thô với tham số đã được ánh xạ
    let rawData;
    switch (dataSource.connectorType) {
      case "api":
        rawData = await executeApiDataSource(
          dataSource.connectionConfig,
          finalParams, // [MOD] Sử dụng finalParams
        );
        break;
      case "google_sheet":
        rawData = await readFromGoogleSheet(dataSource.connectionConfig);
        break;
      case "local_mongodb":
        rawData = await executeMongoDbDataSource(
          dataSource.databasePipeline,
          finalParams, // [MOD] Sử dụng finalParams
        );
        break;
      default:
        throw new Error(
          `Connector type "${dataSource.connectorType}" is not supported.`,
        );
    }

    // GIAI ĐOẠN 2: PROCESS - Xử lý dữ liệu thô nếu có pipeline
    if (dataSource.connectionConfig?.processingPipeline?.length > 0) {
      let processedData = Array.isArray(rawData) ? [...rawData] : rawData;
      const sortedPipeline =
        dataSource.connectionConfig.processingPipeline.sort(
          (a, b) => a.step - b.step,
        );

      for (const step of sortedPipeline) {
        const processFn = processingFunctions[step.action];
        if (typeof processFn === "function") {
          processedData = processFn(processedData, step.params);
        } else {
          console.warn(
            `Processing function "${step.action}" not found. Skipping step.`,
          );
        }
      }
      return processedData;
    }

    // GIAI ĐOẠN 3: RETURN - Trả về dữ liệu
    return rawData;
  } catch (error) {
    // [MOD] Xóa log cũ, chỉ giữ lại lỗi
    return { error: true, message: error.message };
  }
}
