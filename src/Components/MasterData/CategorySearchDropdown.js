"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Spinner } from "reactstrap";
import {
  RiSearchLine,
  RiCloseLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiFolder3Line
} from "react-icons/ri";

/**
 * CategorySearchDropdown
 * Inline searchable category dropdown for table rows and filter bars.
 * 
 * Props:
 * - currentCategories: Array of category objects or single category object
 * - categories: Array of flattened categories { id, name }
 * - onSelect: (category) => Promise<void> | void
 * - isUpdating: boolean (shows mini spinner while saving)
 * - placeholder: string (default: "Select Category")
 * - isFilter: boolean (if true, styled for top filter bar with "All Categories")
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

  // Normalize current category name and id
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

  // Auto-focus search input when opening
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
      style={{ minWidth: isFilter ? "100%" : "150px" }}
    >
      {/* Trigger Button */}
      {isFilter ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="form-select text-start d-flex align-items-center justify-content-between text-truncate w-100"
          style={{ cursor: "pointer", fontSize: "0.875rem", height: "38px" }}
        >
          <span className="text-truncate">
            {currentCategory ? currentCategory.name : "All Categories"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => !isUpdating && setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`btn btn-sm d-inline-flex align-items-center justify-content-between gap-1.5 py-1 px-2.5 rounded-2 border text-truncate ${
            currentCategory
              ? "btn-light border-slate-300 text-slate-800 fw-medium shadow-none hover-bg-slate"
              : "btn-outline-dashed text-muted border-secondary-subtle"
          }`}
          style={{
            maxWidth: "210px",
            fontSize: "0.8125rem",
            backgroundColor: currentCategory ? "#f8fafc" : "transparent"
          }}
          title={currentCategory ? currentCategory.name : placeholder}
        >
          {isUpdating ? (
            <span className="d-flex align-items-center gap-1.5 text-primary">
              <Spinner size="sm" style={{ width: "0.85rem", height: "0.85rem" }} />
              <span className="text-xs">Saving...</span>
            </span>
          ) : (
            <>
              <span className="text-truncate d-flex align-items-center gap-1">
                <RiFolder3Line className="text-muted flex-shrink-0" size={14} />
                <span className="text-truncate">
                  {currentCategory ? currentCategory.name : placeholder}
                </span>
              </span>
              <RiArrowDownSLine className="text-muted flex-shrink-0 ms-1" size={14} />
            </>
          )}
        </button>
      )}

      {/* Dropdown Menu / Popover */}
      {isOpen && (
        <div
          className="position-absolute bg-white rounded-3 shadow-lg border p-2"
          style={{
            top: "calc(100% + 4px)",
            left: 0,
            width: isFilter ? "100%" : "290px",
            minWidth: "260px",
            zIndex: 1060,
            maxHeight: "340px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
          }}
        >
          {/* Search Box Header */}
          <div className="position-relative mb-2 flex-shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              className="form-control form-control-sm pe-4 ps-4"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
              }}
            />
            <RiSearchLine
              className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
              size={13}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted"
                onClick={() => setSearchQuery("")}
              >
                <RiCloseLine size={14} />
              </button>
            )}
          </div>

          {/* Quick Counter / Clear Action */}
          <div className="d-flex justify-content-between align-items-center px-1 mb-1 text-xs text-muted flex-shrink-0">
            <span>
              {filteredCategories.length} categor{filteredCategories.length === 1 ? "y" : "ies"}
            </span>
            {isFilter ? (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-xs text-primary text-decoration-none"
                onClick={() => handleSelect(null)}
              >
                Reset to All
              </button>
            ) : (
              currentCategory && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-xs text-danger text-decoration-none"
                  onClick={handleClear}
                >
                  Unassign
                </button>
              )
            )}
          </div>

          {/* Scrollable Categories List */}
          <div
            className="overflow-auto pe-1"
            style={{ maxHeight: "220px", flexGrow: 1 }}
          >
            {isFilter && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-100 text-start btn btn-sm py-1.5 px-2 mb-1 rounded-2 border-0 d-flex align-items-center justify-content-between text-xs ${
                  !selectedId ? "bg-primary text-white fw-semibold" : "bg-transparent text-slate-700 hover-bg-light"
                }`}
              >
                <span>All Categories</span>
                {!selectedId && <RiCheckLine size={15} />}
              </button>
            )}

            {filteredCategories.length === 0 ? (
              <div className="text-center py-3 text-muted text-xs">
                No categories match &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected =
                  currentCategory &&
                  (String(currentCategory.id) === String(cat.id) ||
                    currentCategory.name === cat.name);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={`w-100 text-start btn btn-sm py-1.5 px-2 mb-0.5 rounded-2 border-0 d-flex align-items-center justify-content-between text-xs ${
                      isSelected
                        ? "bg-primary text-white fw-semibold"
                        : "bg-transparent text-slate-700 hover-bg-light"
                    }`}
                    style={{ transition: "background-color 150ms ease" }}
                  >
                    <span className="text-truncate me-2" title={cat.name}>
                      {cat.name}
                    </span>
                    {isSelected && <RiCheckLine className="flex-shrink-0" size={15} />}
                  </button>
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
