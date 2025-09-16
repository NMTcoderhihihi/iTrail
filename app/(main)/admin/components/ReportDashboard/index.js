// [MOD] app/(main)/admin/components/ReportDashboard/index.js
"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./ReportDashboard.module.css";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getOverallReportData,
  getEmployeeReportData,
  getCustomerGrowthData, // [ADD]
  getActionDistributionData, // [ADD]
  getTopPerformingUsers, // [ADD]
} from "@/app/data/report/report.queries";
import { getUsersForFilter } from "@/app/data/user/user.queries";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Svg_Reload } from "@/components/(icon)/svg";
import BarChart from "./charts/BarChart"; // [ADD]
import LineChart from "./charts/LineChart"; // [ADD]
import PieChart from "./charts/PieChart"; // [ADD]

// Widget component để hiển thị từng số liệu
const StatWidget = ({ title, value, icon }) => (
  <div className={styles.widget}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.text}>
      <div className={styles.value}>{value}</div>
      <div className={styles.title}>{title}</div>
    </div>
  </div>
);

// Component cho Báo cáo Tổng thể
const OverviewDashboard = () => {
  const [stats, setStats] = useState(null);
  const [growthData, setGrowthData] = useState([]);
  const [actionData, setActionData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [statsResult, growthResult, actionResult, topUsersResult] =
      await Promise.all([
        getOverallReportData(),
        getCustomerGrowthData(),
        getActionDistributionData(),
        getTopPerformingUsers(),
      ]);

    if (statsResult.success) setStats(statsResult.data);
    if (growthResult.success) setGrowthData(growthResult.data);
    if (actionResult.success) setActionData(actionResult.data);
    if (topUsersResult.success) setTopUsers(topUsersResult.data);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // [ADD] Hàm xử lý khi nhấn nút refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className={styles.titleContainer}>
        <h2 className={styles.title}>Báo cáo Tổng thể</h2>
        <div className={styles.headerControls}>
          <button
            onClick={handleRefresh}
            className={`${styles.reloadButton} ${
              isRefreshing ? styles.reloading : ""
            }`}
            disabled={isRefreshing}
          >
            <Svg_Reload w={16} h={16} />
            <span>{isRefreshing ? "Đang tải..." : "Tải lại"}</span>
          </button>
        </div>
      </div>
      <div className={styles.dashboardGrid}>
        <div className={styles.chartCard} style={{ gridColumn: "span 12" }}>
          <LineChart
            data={growthData}
            title="Tăng trưởng Khách hàng (30 ngày qua)"
          />
        </div>
        <div className={styles.chartCard} style={{ gridColumn: "span 5" }}>
          <PieChart data={actionData} title="Phân bổ Hành động (7 ngày qua)" />
        </div>
        <div className={styles.chartCard} style={{ gridColumn: "span 7" }}>
          <BarChart
            data={topUsers}
            title="Top 5 Nhân viên Tích cực (7 ngày qua)"
          />
        </div>
      </div>
    </>
  );
};

// [MOD] Nâng cấp Báo cáo Nhân viên để chứa biểu đồ
const EmployeeDashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lấy danh sách nhân viên để tạo tab
  useEffect(() => {
    const fetchUsers = async () => {
      const usersData = await getUsersForFilter();
      setUsers(usersData || []);
      // Mặc định chọn nhân viên đầu tiên nếu chưa có ai được chọn
      const currentUserId = searchParams.get("employee");
      if (currentUserId) {
        setSelectedUserId(currentUserId);
      } else if (usersData && usersData.length > 0) {
        setSelectedUserId(usersData[0]._id);
      }
      setIsLoading(false);
    };
    fetchUsers();
  }, [searchParams]);

  // Fetch dữ liệu báo cáo khi selectedUserId thay đổi
  const fetchReport = useCallback(async () => {
    if (!selectedUserId) return;
    const result = await getEmployeeReportData({ userId: selectedUserId });
    if (result.success) {
      setReportData(result.data);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchReport();
    const intervalId = setInterval(fetchReport, 30000);
    return () => clearInterval(intervalId);
  }, [fetchReport]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchReport();
    setIsRefreshing(false);
  };

  const handleTabClick = (userId) => {
    setSelectedUserId(userId);
    // Cập nhật URL mà không reload trang
    router.push(`/admin?tab=reports-employee&employee=${userId}`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className={styles.titleContainer}>
        <h2 className={styles.title}>Báo cáo Nhân viên</h2>
        <div className={styles.headerControls}>
          <button
            onClick={handleRefresh}
            className={`${styles.reloadButton} ${
              isRefreshing ? styles.reloading : ""
            }`}
            disabled={isRefreshing || !selectedUserId}
          >
            <Svg_Reload w={16} h={16} />
            <span>{isRefreshing ? "Đang tải..." : "Tải lại"}</span>
          </button>
        </div>
      </div>
      <div className={styles.employeeTabs}>
        {users.map((user) => (
          <button
            key={user._id}
            className={`${styles.tabItem} ${
              selectedUserId === user._id ? styles.active : ""
            }`}
            onClick={() => handleTabClick(user._id)}
          >
            {user.name}
          </button>
        ))}
      </div>
      <div className={styles.reportContent}>
        {reportData.length > 0 ? (
          <div className={styles.chartCard}>
            <BarChart data={reportData} title="Thống kê hành động hôm nay" />
          </div>
        ) : (
          <p className={styles.placeholder}>
            Nhân viên này chưa có hành động nào hôm nay.
          </p>
        )}
      </div>
    </div>
  );
};

// Component chính
export default function ReportDashboard() {
  const searchParams = useSearchParams();
  const reportType = searchParams.get("tab");

  const isOverview = reportType === "reports-overview";

  return (
    <div className={styles.container}>
      {isOverview ? <OverviewDashboard /> : <EmployeeDashboard />}
    </div>
  );
}
