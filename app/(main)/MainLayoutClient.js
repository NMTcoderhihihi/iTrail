// [ADD] app/(main)/MainLayoutClient.js

"use client";

import React, { useState } from "react";
import Nav from "@/components/(layout)/nav";
import styles from "./layout.module.css";

export default function MainLayoutClient({ user, navData, children }) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  return (
    <div className={styles.layout}>
      {user && (
        <div
          className={`${styles.nav} ${
            isNavCollapsed ? styles.navCollapsed : ""
          }`}
        >
          <Nav
            user={user}
            navData={navData}
            isCollapsed={isNavCollapsed}
            onToggleCollapse={() => setIsNavCollapsed(!isNavCollapsed)}
          />
        </div>
      )}
      <div className={styles.main}>{children}</div>
    </div>
  );
}
