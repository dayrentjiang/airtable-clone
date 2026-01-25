"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../hooks/useViewConfig";
import { useToolbarPopovers } from "../hooks/useToolbarPopovers";
import { api } from "~/trpc/react";
import type { Sort } from "~/server/lib/types";

/**
 * SORT POPOVER COMPONENT
 *
 * HOW SORTING WORKS:
 *
 * 1. User clicks "Sort" button → opens this popover
 * 2. User selects column and direction (A→Z or Z→A for text, ascending/descending for numbers)
 * 3. Sorts apply immediately (no "Apply" button)
 * 4. DataGrid re-queries with new sorts
 * 5. Results are sorted on the server (PostgreSQL ORDER BY)
 *
 * KEY PATTERN: Immediate Updates
 * - Like filters, sorts apply instantly
 * - No debouncing needed (no typing involved)
 */

// ---------------------------------------------------------------------------
// ICONS
// ---------------------------------------------------------------------------

function SortIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18M3 12h12M3 18h6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SORT DIRECTION LABELS
// ---------------------------------------------------------------------------

const TEXT_DIRECTIONS = [
  { value: "asc" as const, label: "A → Z" },
  { value: "desc" as const, label: "Z → A" },
];

const NUMBER_DIRECTIONS = [
  { value: "asc" as const, label: "1 → 9" },
  { value: "desc" as const, label: "9 → 1" },
];

// ---------------------------------------------------------------------------
// COLUMN TYPE
// ---------------------------------------------------------------------------

interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
}

// ---------------------------------------------------------------------------
// SINGLE SORT ROW COMPONENT
// ---------------------------------------------------------------------------

interface SortRowProps {
  sort: Sort;
  index: number;
  columns: Column[];
  isFirst: boolean;
  onUpdate: (index: number, sort: Sort) => void;
  onRemove: (index: number) => void;
}

function SortRow({
  sort,
  index,
  columns,
  isFirst,
  onUpdate,
  onRemove,
}: SortRowProps) {
  // Find current column to determine type
  const currentColumn = columns.find((c) => c.id === sort.columnId);
  const columnType = currentColumn?.type ?? "TEXT";
  const directions =
    columnType === "NUMBER" ? NUMBER_DIRECTIONS : TEXT_DIRECTIONS;

  const handleColumnChange = (columnId: string) => {
    const newColumn = columns.find((c) => c.id === columnId);
    const newType = newColumn?.type ?? "TEXT";

    // Keep direction if column type doesn't change, otherwise reset to asc
    const shouldResetDirection = columnType !== newType;

    onUpdate(index, {
      ...sort,
      columnId,
      direction: shouldResetDirection ? "asc" : sort.direction,
    });
  };

  const handleDirectionChange = (direction: "asc" | "desc") => {
    onUpdate(index, {
      ...sort,
      direction,
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Sort by label */}
      <span className="w-16 text-xs text-gray-500">
        {isFirst ? "Sort by" : "then by"}
      </span>

      {/* Column selector */}
      <div className="relative">
        <select
          value={sort.columnId}
          onChange={(e) => handleColumnChange(e.target.value)}
          className="h-7 w-32 appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-gray-400">
          <ChevronDownIcon />
        </div>
      </div>

      {/* Direction selector */}
      <div className="relative">
        <select
          value={sort.direction}
          onChange={(e) =>
            handleDirectionChange(e.target.value as "asc" | "desc")
          }
          className="h-7 w-20 appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
        >
          {directions.map((dir) => (
            <option key={dir.value} value={dir.value}>
              {dir.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-gray-400">
          <ChevronDownIcon />
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onRemove(index)}
        className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
        title="Remove sort"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SORT POPOVER COMPONENT
// ---------------------------------------------------------------------------

interface SortPopoverProps {
  tableId: string;
}

export function SortPopover({ tableId }: SortPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddSortPicker, setShowAddSortPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addSortPickerRef = useRef<HTMLDivElement>(null);

  // Use shared popover state
  const { isPopoverOpen, setOpenPopover } = useToolbarPopovers();
  const isOpen = isPopoverOpen("sort");

  // Get sort state directly from context (live updates!)
  const { sorts, addSort, updateSort, removeSort, saveConfig } =
    useViewConfig();

  // Fetch columns for this table
  const { data: table } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId },
  );

  const columns: Column[] = table?.columns ?? [];

  // Get columns that haven't been picked yet for sorting
  const pickedColumnIds = new Set(sorts.map((s) => s.columnId));
  const availableColumns = columns.filter(
    (col) => !pickedColumnIds.has(col.id),
  );

  // Filter columns by search query
  const filteredAvailableColumns = availableColumns.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        void saveConfig({ sorts });
        setOpenPopover(null);
        setShowAddSortPicker(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, sorts, saveConfig, setOpenPopover]);

  // Close add sort picker when clicking outside (but inside main popover)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addSortPickerRef.current &&
        !addSortPickerRef.current.contains(event.target as Node)
      ) {
        setShowAddSortPicker(false);
        setSearchQuery("");
      }
    }

    if (showAddSortPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAddSortPicker]);

  // Add a sort by clicking a column name
  const handlePickColumn = (columnId: string) => {
    addSort({
      columnId,
      direction: "asc",
    });
    setSearchQuery(""); // Clear search after picking
    setShowAddSortPicker(false); // Close picker after selecting
  };

  // Check if sorts are active (for button styling)
  const hasActiveSorts = sorts.length > 0;

  // Generate sort summary for button text
  const getSortSummary = () => {
    if (sorts.length === 0) return "Sort";

    // Get column names for sorts
    const sortNames = sorts
      .map((s) => {
        const col = columns.find((c) => c.id === s.columnId);
        return col?.name;
      })
      .filter(Boolean);

    if (sortNames.length === 0) return "Sort";

    // Show up to 2 sort names, then "..."
    if (sortNames.length === 1) {
      return `Sorted by ${sortNames[0]}`;
    } else if (sortNames.length === 2) {
      return `Sorted by ${sortNames.join(", ")}`;
    } else {
      return `Sorted by ${sortNames.slice(0, 2).join(", ")}, ...`;
    }
  };

  return (
    <div className="relative">
      {/* Sort button */}
      <button
        ref={buttonRef}
        onClick={() => setOpenPopover(isOpen ? null : "sort")}
        className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-xs md:px-2 ${
          hasActiveSorts
            ? "bg-orange-100 text-black"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <SortIcon />
        <span className="hidden md:inline">{getSortSummary()}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 z-50 mt-1 min-w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 text-xs text-gray-500">
            Sort by <span className="ml-1 text-gray-400">(?)</span>
          </div>

          {/* Content: Show column picker if no sorts, otherwise show sort rows */}
          {sorts.length === 0 ? (
            /* Column Picker - Show all columns when no sorts yet */
            <div className="max-h-80 overflow-y-auto">
              {/* Search input */}
              <div className="sticky top-0 bg-white px-4 py-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find a field"
                    className="w-full rounded border border-gray-300 px-3 py-1.5 pl-8 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <svg
                    className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
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
                </div>
              </div>

              {/* Column list */}
              <div className="px-2 pb-2">
                {filteredAvailableColumns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handlePickColumn(col.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                  >
                    <span className="text-gray-400">A</span>
                    <span>{col.name}</span>
                  </button>
                ))}
                {filteredAvailableColumns.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-gray-400">
                    No fields found
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Sort Rows - Show active sorts and add button */
            <div className="px-4 py-2">
              {sorts.map((sort, index) => (
                <SortRow
                  key={index}
                  sort={sort}
                  index={index}
                  columns={columns}
                  isFirst={index === 0}
                  onUpdate={updateSort}
                  onRemove={removeSort}
                />
              ))}

              {/* Add another sort button - only show if there are available columns */}
              {availableColumns.length > 0 && (
                <div className="relative mt-2">
                  <button
                    onClick={() => setShowAddSortPicker(!showAddSortPicker)}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    <PlusIcon />
                    <span>Add another sort</span>
                  </button>

                  {/* Dropdown picker for available columns */}
                  {showAddSortPicker && (
                    <div
                      ref={addSortPickerRef}
                      className="absolute top-full left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
                    >
                      {/* Search input */}
                      <div className="sticky top-0 bg-white px-4 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a field"
                            className="w-full rounded border border-gray-300 px-3 py-1.5 pl-8 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                          />
                          <svg
                            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400"
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
                        </div>
                      </div>

                      {/* Column list */}
                      <div className="max-h-60 overflow-y-auto px-2 pb-2">
                        {filteredAvailableColumns.map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handlePickColumn(col.id)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                          >
                            <span className="text-gray-400">A</span>
                            <span>{col.name}</span>
                          </button>
                        ))}
                        {filteredAvailableColumns.length === 0 && (
                          <div className="px-2 py-4 text-center text-xs text-gray-400">
                            No fields found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
