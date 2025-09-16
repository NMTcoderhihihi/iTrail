// [ADD] app/(main)/admin/components/ReportDashboard/charts/LineChart.js
"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { commonOptions } from "./chart-options";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export default function LineChart({ data, title }) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: "Khách hàng mới",
        data: data.map((d) => d.count),
        borderColor: "rgb(234, 179, 8)",
        backgroundColor: "rgba(234, 179, 8, 0.5)",
        fill: true,
        tension: 0.4,
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

  return <Line options={options} data={chartData} />;
}
