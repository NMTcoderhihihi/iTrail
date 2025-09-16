// [FIX] components/(layout)/nav/index.js (Bản sửa lỗi cuối cùng)
"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./index.module.css";
import {
  Svg_Student,
  Svg_Dev,
  Svg_Admin,
  Svg_Logout,
  Svg_Chart, // [ADD] Import icon mới
} from "@/components/(icon)/svg";
import { logoutUser } from "@/app/data/auth/auth.actions";

// --- Sub-components (Component con) ---

const ChevronIcon = ({ isExpanded }) => (
  <svg
    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// Component render nội dung của một mục menu (icon và label)
const MenuItemContent = ({ item }) => (
  <>
    {item.icon && <item.icon w={20} h={20} c={"currentColor"} />}
    <span className={styles.navLabel}>{item.label}</span>
  </>
);

// Component cho một mục menu hoàn chỉnh
const NavMenuItem = ({ item, isExpanded, onToggle, isSubmenu = false }) => {
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const isActive =
    item.isActive || (isExpanded && item.subItems?.some((sub) => sub.isActive));

  const content = (
    <div className={styles.navLinkContent}>
      {/* [MOD] Đảo vị trí của ChevronIcon và MenuItemContent */}
      {hasSubItems && <ChevronIcon isExpanded={isExpanded} />}
      <MenuItemContent item={item} />
    </div>
  );

  if (hasSubItems && !item.href) {
    return (
      <div
        className={`${isSubmenu ? styles.subNavItem : styles.navItem} ${
          isActive ? styles.active : ""
        }`}
        onClick={onToggle}
        title={item.label}
      >
        {content}
      </div>
    );
  }

  // Nếu là mục menu con (không có subItems), nó sẽ là một Link
  return (
    <Link
      href={item.href}
      className={`${isSubmenu ? styles.subNavItem : styles.navItem} ${
        isActive ? styles.active : ""
      }`}
      title={item.label}
      onClick={hasSubItems ? onToggle : undefined}
    >
      {content}
    </Link>
  );
};

// --- Main Nav Component ---

export default function Nav({ user, navData, isCollapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initial = new Set();
    if (pathname.startsWith("/admin")) {
      initial.add("admin");
      if (["running", "archived"].includes(activeTab))
        initial.add("admin-campaigns");
      if (["labels", "variants"].includes(activeTab))
        initial.add("admin-content");
      // [ADD] Tự động mở menu tài khoản
      if (["accounts", "users"].includes(activeTab))
        initial.add("admin-accounts");
      // [ADD] Tự động mở menu báo cáo
      if (["reports-overview", "reports-employee"].includes(activeTab))
        initial.add("admin-reports");
    }
    if (pathname === "/") initial.add("care");
    return initial;
  });

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const navConfig = useMemo(() => {
    const careSubItems = [
      {
        href: "/",
        label: "Tất cả Khách hàng",
        isActive: pathname === "/" && !searchParams.has("program"),
      },
      ...(navData?.carePrograms || []).map((program) => ({
        href: `/?program=${program._id}`,
        label: program.name,
        isActive:
          pathname === "/" && searchParams.get("program") === program._id,
      })),
    ];

    const adminSubItems = [
      // [ADD] Thêm mục menu Báo cáo mới
      {
        key: "admin-reports",
        label: "📈 Báo cáo",
        isActive:
          activeTab === "reports-overview" || activeTab === "reports-employee",
        subItems: [
          {
            href: "/admin?tab=reports-overview",
            label: "Báo cáo tổng thể",
            isActive: activeTab === "reports-overview",
          },
          {
            href: "/admin?tab=reports-employee",
            label: "Báo cáo nhân viên",
            isActive: activeTab === "reports-employee",
          },
        ],
      },
      {
        key: "admin-campaigns",
        label: "🚀 Chiến dịch",
        isActive: ["running", "archived"].includes(activeTab),
        subItems: [
          {
            href: "/admin?tab=running",
            label: "Đang chạy",
            isActive: activeTab === "running",
          },
          {
            href: "/admin?tab=archived",
            label: "Lịch sử",
            isActive: activeTab === "archived",
          },
        ],
      },
      // [ADD] Menu cha "Tài khoản" mới
      {
        key: "admin-accounts",
        label: "👥 Tài khoản",
        // icon: Svg_Accounts,
        isActive: ["accounts", "users"].includes(activeTab),
        subItems: [
          {
            href: "/admin?tab=accounts",
            label: "Quản lý TK Zalo",
            isActive: activeTab === "accounts",
          },
          {
            href: "/admin?tab=users",
            label: "Quản lý User",
            isActive: activeTab === "users",
          },
        ],
      },
      {
        key: "admin-content",
        label: "📝 Mẫu tin nhắn & biến thể",
        isActive: ["labels", "variants"].includes(activeTab),
        subItems: [
          {
            href: "/admin?tab=labels",
            label: "Mẫu tin nhắn",
            isActive: activeTab === "labels",
          },
          {
            href: "/admin?tab=variants",
            label: "Biến thể",
            isActive: activeTab === "variants",
          },
        ],
      },
      // [DEL] Xóa 2 mục đã được gộp
      {
        href: "/admin?tab=programs",
        label: "📋 Chương trình CS",
        isActive: activeTab === "programs",
      },
      {
        href: "/admin?tab=fields",
        label: "📝 Trường dữ liệu",
        isActive: activeTab === "fields",
      },
      {
        href: "/admin?tab=datasources",
        label: "🔌 Nguồn dữ liệu",
        isActive: activeTab === "datasources",
      },
      {
        href: "/admin?tab=tags",
        label: "🏷️ Quản lý Tag",
        isActive: activeTab === "tags",
      },
      {
        href: "/admin?tab=reports",
        label: "📈 Quản lý Báo cáo",
        isActive: activeTab === "reports",
      },
    ];

    return [
      {
        key: "care",
        href: "/",
        icon: Svg_Student,
        label: "Khách hàng",
        roles: ["Admin", "Employee"],
        subItems: careSubItems,
        isActive: pathname === "/",
      },
      {
        key: "admin",
        icon: Svg_Admin,
        label: "Quản lý",
        roles: ["Admin"],
        subItems: adminSubItems,
        isActive: pathname.startsWith("/admin"),
      },
      {
        key: "dev",
        href: "/dev",
        icon: Svg_Dev,
        label: "Dev",
        roles: ["Admin"],
        isActive: pathname.startsWith("/dev"),
      },
    ];
  }, [pathname, searchParams, navData, activeTab]);

  const accessibleNavItems = useMemo(
    () => navConfig.filter((item) => item.roles.includes(user?.role)),
    [user?.role, navConfig],
  );

  const renderMenuItems = (items, isSubmenu = false) => {
    return items.map((item) => (
      <div key={item.key || item.href}>
        <NavMenuItem
          item={item}
          isExpanded={expandedMenus.has(item.key)}
          onToggle={() => toggleMenu(item.key)}
          isSubmenu={isSubmenu}
        />
        {!isCollapsed && item.subItems && expandedMenus.has(item.key) && (
          <div className={styles.subMenu}>
            {renderMenuItems(item.subItems, true)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <nav
      className={`${styles.navContainer} ${
        isCollapsed ? styles.collapsed : ""
      }`}
    >
      <div className={styles.logoSection}>
        {!isCollapsed && <p className={styles.logoText}>iTrail</p>}
        <button onClick={onToggleCollapse} className={styles.collapseButton}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={`${styles.menuSection} ${styles.customScroll}`}>
        {renderMenuItems(accessibleNavItems)}
      </div>

      <div className={styles.userSection}>
        {!isCollapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || "User"}</span>
            <span className={styles.userRole}>{user?.role || "Employee"}</span>
          </div>
        )}
        <form action={logoutUser}>
          <button
            type="submit"
            className={styles.logoutButton}
            title="Đăng xuất"
          >
            <Svg_Logout w={20} h={20} />
          </button>
        </form>
      </div>
    </nav>
  );
}
