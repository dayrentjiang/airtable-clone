"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../hooks/useViewConfig";
import { useToolbarPopovers } from "../hooks/useToolbarPopovers";
import { api } from "~/trpc/react";

/**
 * HIDE FIELDS POPOVER COMPONENT
 *
 * HOW IT WORKS:
 *
 * 1. User clicks "Hide fields" button → opens this popover
 * 2. Shows all columns with toggle switches (eye icons)
 * 3. User can search to filter columns
 * 4. Toggle visibility → immediately updates DataGrid
 * 5. "Hide all" / "Show all" bulk actions
 * 6. Auto-saves to view config on close
 *
 * KEY PATTERN: Immediate Updates
 * - Like filters/sorts, visibility changes apply instantly
 * - Hidden columns are removed from DataGrid immediately
 */

// ---------------------------------------------------------------------------
// ICONS
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// COLUMN TYPE
// ---------------------------------------------------------------------------

interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
}

// ---------------------------------------------------------------------------
// HIDE FIELDS POPOVER COMPONENT
// ---------------------------------------------------------------------------

interface HideFieldsPopoverProps {
  tableId: string;
}

export function HideFieldsPopover({ tableId }: HideFieldsPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use shared popover state
  const { isPopoverOpen, setOpenPopover } = useToolbarPopovers();
  const isOpen = isPopoverOpen("hideFields");

  // Get hidden fields state from context
  const { hiddenFields, toggleFieldVisibility, setHiddenFields, saveConfig } =
    useViewConfig();

  // Fetch columns for this table
  const { data: table } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId },
  );

  const columns: Column[] = table?.columns ?? [];

  // Filter columns by search query
  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Count visible fields
  const visibleCount = columns.length - hiddenFields.length;

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // Save config when closing popover
        void saveConfig({ hiddenFields });
        setOpenPopover(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, hiddenFields, saveConfig, setOpenPopover]);

  // Hide all fields
  const handleHideAll = () => {
    const allColumnIds = columns.map((col) => col.id);
    setHiddenFields(allColumnIds);
  };

  // Show all fields
  const handleShowAll = () => {
    setHiddenFields([]);
  };

  // Check if field is visible
  const isVisible = (columnId: string) => !hiddenFields.includes(columnId);

  // Check if any fields are hidden
  const hasHiddenFields = hiddenFields.length > 0;
  const hiddenFieldsLabel =
    hiddenFields.length === 1
      ? "1 hidden field"
      : `${hiddenFields.length} hidden fields`;

  return (
    <div className="relative">
      {/* Hide fields button */}
      <button
        ref={buttonRef}
        onClick={() => setOpenPopover(isOpen ? null : "hideFields")}
        className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 md:px-2 ${
          hasHiddenFields ? "bg-blue-50 text-black" : "text-gray-600"
        }`}
      >
        <EyeOffIcon />
        <span className="hidden md:inline">
          {hasHiddenFields ? hiddenFieldsLabel : "Hide fields"}
        </span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOffIcon />
                <span className="text-sm font-medium text-gray-700">
                  Hide fields
                </span>
              </div>
              <button
                onClick={() => {
                  void saveConfig({ hiddenFields });
                  setOpenPopover(null);
                }}
                className="cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a field"
                className="w-full rounded border border-gray-300 px-3 py-1.5 pl-8 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
            </div>
          </div>

          {/* Column list */}
          <div className="max-h-80 overflow-y-auto">
            {filteredColumns.map((col) => {
              const visible = isVisible(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => toggleFieldVisibility(col.id)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {/* Eye icon toggle */}
                  <div
                    className={`shrink-0 ${visible ? "text-green-600" : "text-gray-300"}`}
                  >
                    {visible ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                  </div>

                  {/* Column type icon */}
                  <span className="shrink-0 text-gray-400">
                    {col.type === "NUMBER" ? "#" : "A"}
                  </span>

                  {/* Column name */}
                  <span className="flex-1">{col.name}</span>

                  {/* Drag handle (visual only for now) */}
                  <div className="shrink-0 text-gray-300">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                  </div>
                </button>
              );
            })}

            {filteredColumns.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No fields found
              </div>
            )}
          </div>

          {/* Footer with bulk actions */}
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={handleHideAll}
                disabled={hiddenFields.length === columns.length}
                className="cursor-pointer text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Hide all
              </button>
              <span className="text-gray-500">
                {visibleCount} of {columns.length} shown
              </span>
              <button
                onClick={handleShowAll}
                disabled={hiddenFields.length === 0}
                className="cursor-pointer text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Show all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
