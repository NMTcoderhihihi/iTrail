// [ADD] app/(main)/admin/components/ReportDashboard/charts/PieChart.js
"use client";

import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { commonOptions } from "./chart-options";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function PieChart({ data, title }) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Số lượng",
        data: data.map((d) => d.count),
        backgroundColor: [
          "rgba(239, 68, 68, 0.7)",
          "rgba(59, 130, 246, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(16, 185, 129, 0.7)",
          "rgba(139, 92, 246, 0.7)",
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(139, 92, 246, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    ...commonOptions,
    scales: {}, // Pie chart doesn't need scales
    plugins: {
      ...commonOptions.plugins,
      title: {
        display: true,
        text: title,
      },
    },
  };

  return <Pie data={chartData} options={options} />;
}
