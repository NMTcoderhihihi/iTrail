// [ADD] app/(main)/client/ui/filters/MultiSelectFilter.js

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import styles from "./MultiSelectFilter.module.css";

const ChevronIcon = ({ isExpanded }) => (
  <svg
    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function MultiSelectFilter({
  title,
  options = [],
  selectedValues, // Đây là một Set
  onChange, // Hàm này sẽ nhận một Set mới
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  // Logic để đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  const handleToggleOption = (optionId) => {
    const newSet = new Set(selectedValues);
    if (newSet.has(optionId)) {
      newSet.delete(optionId);
    } else {
      newSet.add(optionId);
    }
    onChange(newSet);
  };

  const handleClear = () => {
    onChange(new Set());
    setIsOpen(false);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button className={styles.button} onClick={() => setIsOpen(!isOpen)}>
        <span>
          {title} {selectedValues.size > 0 && `(${selectedValues.size})`}
        </span>
        <ChevronIcon isExpanded={isOpen} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {selectedValues.size > 0 && (
              <button onClick={handleClear} className={styles.clearButton}>
                Bỏ chọn
              </button>
            )}
          </div>
          <div className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <label key={option._id} className={styles.optionItem}>
                  <input
                    type="checkbox"
                    checked={selectedValues.has(option._id)}
                    onChange={() => handleToggleOption(option._id)}
                  />
                  <span>{option.name}</span>
                </label>
              ))
            ) : (
              <div className={styles.noOptions}>Không có kết quả.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
