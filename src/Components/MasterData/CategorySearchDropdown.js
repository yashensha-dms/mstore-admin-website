"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Spinner } from "reactstrap";
import {
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiFolder3Line,
  RiFolderFill
} from "react-icons/ri";

/**
 * CategorySearchDropdown
 * High-readability inline searchable category dropdown.
 * Uses explicit CSS styles to prevent theme styles from rendering text in white/invisible.
 */
export const CategorySearchDropdown = ({
  currentCategories = [],
  categories = [],
  onSelect,
  isUpdating = false,
  placeholder = "Select Category",
  isFilter = false,
  selectedId = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize current category
  const currentCategory = useMemo(() => {
    if (isFilter) {
      if (!selectedId) return null;
      return categories.find((c) => String(c.id) === String(selectedId)) || null;
    }
    if (Array.isArray(currentCategories) && currentCategories.length > 0) {
      return currentCategories[0];
    }
    if (currentCategories && typeof currentCategories === "object" && currentCategories.id) {
      return currentCategories;
    }
    return null;
  }, [currentCategories, categories, isFilter, selectedId]);

  // Filter categories by search term
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => {
      const name = (cat.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [categories, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (cat) => {
    setIsOpen(false);
    if (onSelect) {
      onSelect(cat);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onSelect) {
      onSelect(null);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="position-relative d-inline-block text-start"
      style={{ width: isFilter ? "100%" : "auto" }}
    >
      {/* Trigger Button */}
      {isFilter ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "100%",
            height: "38px",
            padding: "6px 12px",
            backgroundColor: "#ffffff",
            color: currentCategory ? "#0f172a" : "#64748b",
            fontSize: "13px",
            fontWeight: currentCategory ? "600" : "400",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            textAlign: "left"
          }}
        >
          <span className="text-truncate" style={{ color: "#0f172a" }}>
            {currentCategory ? currentCategory.name : "All Categories"}
          </span>
          <RiArrowDownSLine size={16} style={{ color: "#64748b", flexShrink: 0 }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => !isUpdating && setIsOpen(!isOpen)}
          disabled={isUpdating}
          style={{
            maxWidth: "220px",
            minWidth: "130px",
            padding: "5px 10px",
            backgroundColor: currentCategory ? "#f1f5f9" : "#ffffff",
            color: currentCategory ? "#0f172a" : "#64748b",
            fontSize: "12px",
            fontWeight: "600",
            border: currentCategory ? "1px solid #cbd5e1" : "1px dashed #94a3b8",
            borderRadius: "6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            cursor: isUpdating ? "wait" : "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
          title={currentCategory ? currentCategory.name : placeholder}
        >
          {isUpdating ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#0da487" }}>
              <Spinner size="sm" style={{ width: "0.8rem", height: "0.8rem" }} />
              <span style={{ fontSize: "11px", fontWeight: "600" }}>Updating...</span>
            </span>
          ) : (
            <>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: currentCategory ? "#0f172a" : "#64748b"
                }}
              >
                {currentCategory ? (
                  <RiFolderFill size={14} style={{ color: "#0da487", flexShrink: 0 }} />
                ) : (
                  <RiFolder3Line size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                )}
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: currentCategory ? "#0f172a" : "#64748b"
                  }}
                >
                  {currentCategory ? currentCategory.name : `+ ${placeholder}`}
                </span>
              </span>
              <RiArrowDownSLine size={14} style={{ color: "#64748b", flexShrink: 0 }} />
            </>
          )}
        </button>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: isFilter ? "100%" : "300px",
            minWidth: "270px",
            zIndex: 9999,
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "8px",
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Search Box Header */}
          <div style={{ position: "relative", marginBottom: "8px", flexShrink: 0 }}>
            <RiSearchLine
              size={15}
              style={{
                position: "absolute",
                top: "50%",
                left: "10px",
                transform: "translateY(-50%)",
                color: "#64748b"
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "6px 28px 6px 32px",
                fontSize: "13px",
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                border: "1.5px solid #0da487",
                borderRadius: "6px",
                outline: "none"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "8px",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#64748b"
                }}
              >
                <RiCloseLine size={16} />
              </button>
            )}
          </div>

          {/* Subheader info & Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2px 4px 6px",
              fontSize: "11px",
              color: "#64748b",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "4px"
            }}
          >
            <span style={{ fontWeight: 500 }}>
              {filteredCategories.length} categories available
            </span>
            {isFilter ? (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0da487",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Show All
              </button>
            ) : (
              currentCategory && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  Unassign
                </button>
              )
            )}
          </div>

          {/* Scrollable Categories List */}
          <div
            style={{
              maxHeight: "230px",
              overflowY: "auto",
              paddingRight: "2px"
            }}
          >
            {isFilter && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(null)}
                style={{
                  padding: "7px 10px",
                  borderRadius: "5px",
                  marginBottom: "2px",
                  fontSize: "12px",
                  fontWeight: !selectedId ? "700" : "500",
                  color: !selectedId ? "#ffffff" : "#0f172a",
                  backgroundColor: !selectedId ? "#0da487" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                onMouseEnter={(e) => {
                  if (selectedId) e.currentTarget.style.backgroundColor = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  if (selectedId) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span>All Categories</span>
                {!selectedId && <RiCheckLine size={15} style={{ color: "#ffffff" }} />}
              </div>
            )}

            {filteredCategories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 8px", fontSize: "12px", color: "#64748b" }}>
                No category matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected =
                  currentCategory &&
                  (String(currentCategory.id) === String(cat.id) ||
                    currentCategory.name === cat.name);

                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(cat)}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "5px",
                      marginBottom: "2px",
                      fontSize: "12px",
                      fontWeight: isSelected ? "700" : "500",
                      color: isSelected ? "#ffffff" : "#0f172a",
                      backgroundColor: isSelected ? "#0da487" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background-color 100ms ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#e2e8f0";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginRight: "8px",
                        color: isSelected ? "#ffffff" : "#0f172a"
                      }}
                      title={cat.name}
                    >
                      {cat.name}
                    </span>
                    {isSelected && (
                      <RiCheckLine size={15} style={{ color: "#ffffff", flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySearchDropdown;
