// [MOD] components/(layout)/nav/index.js (Hoàn chỉnh)

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
} from "@/components/(icon)/svg";
import { logoutUser } from "@/app/data/auth/auth.actions";

// Icon chevron để expand/collapse
const ChevronIcon = ({ isExpanded }) => (
  <svg
    className={`${styles.chevron} ${isExpanded ? "" : styles.chevronCollapsed}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// Component cho menu cha (có thể có con)
const NavItem = ({ item, isActive, isExpanded, onToggle }) => (
  <div
    className={`${styles.navItemContainer} ${
      isActive ? styles.activeParent : ""
    }`}
  >
    <div
      // [MOD] Dùng div thay Link để control event onClick, tránh load lại trang khi chỉ expand
      className={`${styles.navItem} ${isActive ? styles.active : ""}`}
      onClick={item.subItems ? onToggle : undefined}
    >
      <Link href={item.href} className={styles.navLinkContent}>
        <item.icon w={20} h={20} c={"currentColor"} />
        <span className={styles.navLabel}>{item.label}</span>
      </Link>
      {item.subItems && <ChevronIcon isExpanded={isExpanded} />}
    </div>
  </div>
);

// Component cho menu con
const SubNavItem = ({ item, isActive }) => (
  <Link
    href={item.href}
    className={`${styles.subNavItem} ${isActive ? styles.active : ""}`}
  >
    {item.label}
  </Link>
);

export default function Nav({ user, navData, isCollapsed, onToggleCollapse }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State để quản lý menu nào đang mở rộng
  const [expandedMenus, setExpandedMenus] = useState(() => {
    if (pathname.startsWith("/admin")) return new Set(["admin"]);
    if (pathname === "/") return new Set(["care"]);
    return new Set();
  });

  const toggleMenu = (key) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
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
      { key: "labels", label: "🏷️ Nhãn & Mẫu tin" },
      { key: "variants", label: "🎨 Quản lý Biến thể" },
      { key: "statuses", label: "📊 Quản lý Trạng thái" },
      { key: "running", label: "🚀 Đang chạy" },
      { key: "archived", label: "🗂️ Lịch sử" },
      { key: "accounts", label: "👤 Quản lý TK Zalo" },
      { key: "users", label: "👥 Quản lý User" },
    ].map((item) => ({
      href: `/admin?tab=${item.key}`,
      label: item.label,
      isActive: searchParams.get("tab") === item.key,
    }));

    return [
      {
        key: "care",
        href: "/", // Link mặc định khi click vào menu cha
        icon: Svg_Student,
        label: "Chăm sóc",
        roles: ["Admin", "Employee"],
        subItems: careSubItems,
        isActive: pathname === "/",
      },
      {
        key: "admin",
        href: "/admin?tab=running", // Link mặc định khi click vào menu cha
        icon: Svg_Admin,
        label: "Admin",
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
  }, [pathname, searchParams, navData]);

  const accessibleNavItems = useMemo(
    () => navConfig.filter((item) => item.roles.includes(user?.role)),
    [user?.role, navConfig],
  );

  return (
    <nav
      className={`${styles.navContainer} ${
        isCollapsed ? styles.collapsed : ""
      }`}
    >
      <div className={styles.logoSection}>
        {!isCollapsed && <p className={styles.logoText}>iTrail</p>}
        <button onClick={onToggleCollapse} className={styles.collapseButton}>
          {/* Icon mũi tên trái/phải */}
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

      <div className={styles.menuSection}>
        {accessibleNavItems.map((item) => (
          <div key={item.key}>
            <NavItem
              item={item}
              isActive={item.isActive}
              isExpanded={expandedMenus.has(item.key)}
              onToggle={() => toggleMenu(item.key)}
            />
            {item.subItems && expandedMenus.has(item.key) && (
              <div className={styles.subMenu}>
                {item.subItems.map((subItem) => (
                  <SubNavItem
                    key={subItem.href}
                    item={subItem}
                    isActive={subItem.isActive}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.userSection}>
        {/* [MOD] Chỉ hiển thị userInfo khi không thu gọn */}
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
