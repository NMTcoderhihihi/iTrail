// [ADD] app/(main)/client/ui/schedule/SearchableSelect.js
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom"; // [ADD] Import createPortal
import styles from "./SearchableSelect.module.css";

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

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Vui lòng chọn...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({}); // [ADD] State for position
  const buttonRef = useRef(null); // [MOD] Rename ref
  const dropdownRef = useRef(null); // [ADD] Ref for dropdown itself

  const selectedOption = useMemo(
    () => options.find((opt) => opt._id === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.description.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  // [MOD] Update positioning logic when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    }
  }, [isOpen]);

  // [MOD] Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const DropdownContent = (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={dropdownStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Tìm kiếm mẫu tin..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
          autoFocus
        />
      </div>
      <div className={styles.optionsList}>
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <div
              key={option._id}
              className={`${styles.optionItem} ${
                value === option._id ? styles.selected : ""
              }`}
              onClick={() => handleSelect(option._id)}
            >
              {option.description}
            </div>
          ))
        ) : (
          <div className={styles.noOptions}>Không tìm thấy kết quả.</div>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div
        ref={buttonRef}
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.description || placeholder}</span>
        <ChevronIcon isExpanded={isOpen} />
      </div>
      {/* [MOD] Render dropdown using a portal */}
      {isOpen && createPortal(DropdownContent, document.body)}
    </div>
  );
}
