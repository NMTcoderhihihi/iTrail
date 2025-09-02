// models/reportLayout.js
import { Schema, model, models } from "mongoose";

const WidgetDataSourceSchema = new Schema(
  {
    dataSourceId: {
      type: Schema.Types.ObjectId,
      ref: "dataSource",
      required: true,
    },
    selectedFields: [{ type: String, required: true }],
    // **MODIFIED**: Gộp tham số đầu vào vào đây
    inputParams: [
      {
        key: { type: String, required: true }, // Tên tham số (paramName) từ dataSource
        value: { type: Schema.Types.Mixed, required: true }, // Giá trị tĩnh được cấu hình cho widget này
      },
    ],
  },
  { _id: false },
);

const DataMappingSchema = new Schema(
  {
    widgetParam: { type: String, required: true }, // Tên tham số của widget (vd: "pieChartLabels")
    // **MODIFIED**: Cấu trúc source an toàn hơn
    source: {
      type: {
        dataSourceId: {
          type: Schema.Types.ObjectId,
          ref: "dataSource",
          required: true,
        },
        fieldName: { type: String, required: true },
      },
      required: true,
    },
  },
  { _id: false },
);

const GridPositionSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
  },
  { _id: false },
);

const WidgetSchema = new Schema({
  widgetType: {
    type: String,
    required: true,
    enum: ["kpi_card", "bar_chart", "pie_chart", "table", "line_chart"],
  },
  gridPosition: { type: GridPositionSchema, required: true },
  dataSources: [WidgetDataSourceSchema],
  dataMapping: [DataMappingSchema],
  presentationConfig: { type: Schema.Types.Mixed }, // Lưu cấu hình UI (title, color, icon...)
  // **ADDED**: Cấu hình làm mới
  refreshConfig: {
    mode: { type: String, enum: ["manual", "auto"], default: "manual" },
    intervalSeconds: { type: Number, default: 300 },
  },
});

const ReportLayoutSchema = new Schema(
  {
    layoutName: { type: String, required: true },
    description: { type: String },
    widgets: [WidgetSchema],
  },
  { timestamps: true },
);

const ReportLayout =
  models.reportLayout || model("reportLayout", ReportLayoutSchema);

export default ReportLayout;
