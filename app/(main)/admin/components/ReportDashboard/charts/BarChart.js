// [ADD] app/(main)/admin/components/ReportDashboard/charts/BarChart.js
"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { commonOptions } from "./chart-options";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export default function BarChart({ data, title }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Số lượng",
        data: data.map((d) => d.count),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: title,
      },
    },
  };

  return <Bar options={options} data={chartData} />;
}
