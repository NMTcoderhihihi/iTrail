// [ADD] app/(main)/admin/components/ReportDashboard/charts/chart-options.js
"use client";

// Cấu hình chung cho các biểu đồ để đảm bảo giao diện nhất quán

export const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        borderDash: [5, 5],
      },
      beginAtZero: true,
    },
  },
};
