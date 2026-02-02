"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../_state/view-config";
import { useToolbarPopovers } from "./hooks/useToolbarPopovers";
import { api } from "~/trpc/react";
import type { Sort } from "~/server/lib/types";
import {
  ArrowDownUp,
  Plus,
  ChevronDown,
  X,
  CircleQuestionMark,
  AlignLeft,
  Hash,
  Baseline,
} from "lucide-react";
import { Toggle } from "../../ui/Toggle";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// FIELD ICONS
// ---------------------------------------------------------------------------

const getFieldIcon = (type: string) => {
  switch (type) {
    case "NUMBER":
      return <Hash size={14} className="text-gray-500" />;
    case "TEXT":
      return <Baseline size={14} className="text-gray-500" />;
    default:
      return <AlignLeft size={14} className="text-gray-500" />;
  }
};

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
// COLUMN DROPDOWN COMPONENT
// ---------------------------------------------------------------------------

interface ColumnDropdownProps {
  value: string;
  columns: Column[];
  onChange: (columnId: string) => void;
}

function ColumnDropdown({ value, columns, onChange }: ColumnDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedColumn = columns.find((c) => c.id === value);
  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (columnId: string) => {
    onChange(columnId);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-7 w-56 items-center justify-between rounded border border-gray-200 bg-white px-2 text-xs text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
      >
        <span className="truncate">
          {selectedColumn?.name ?? "Select field"}
        </span>
        <ChevronDown size={14} className="ml-1 shrink-0 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-gray-200 p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a field"
              className="w-full rounded px-2 py-1.5 text-xs placeholder-gray-400 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Column list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredColumns.map((col) => (
              <button
                key={col.id}
                onClick={() => handleSelect(col.id)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-gray-900 hover:bg-gray-100"
              >
                {getFieldIcon(col.type)}
                <span>{col.name}</span>
              </button>
            ))}
            {filteredColumns.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No fields found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DIRECTION DROPDOWN COMPONENT
// ---------------------------------------------------------------------------

interface DirectionDropdownProps {
  value: "asc" | "desc";
  directions: { value: "asc" | "desc"; label: string }[];
  onChange: (direction: "asc" | "desc") => void;
}

function DirectionDropdown({
  value,
  directions,
  onChange,
}: DirectionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDirection = directions.find((d) => d.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (direction: "asc" | "desc") => {
    onChange(direction);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-7 w-30 items-center justify-between rounded border border-gray-200 bg-white px-2 text-xs text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
      >
        <span>{selectedDirection?.label ?? "Select"}</span>
        <ChevronDown size={14} className="ml-1 shrink-0 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Direction list */}
          <div className="py-1">
            {directions.map((dir) => (
              <button
                key={dir.value}
                onClick={() => handleSelect(dir.value)}
                className="flex w-full items-center px-3 py-1.5 text-left text-xs text-gray-900 hover:bg-gray-100"
              >
                <span>{dir.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
    <div className="flex items-center gap-2 py-1">
      {/* Column selector with custom dropdown */}
      <ColumnDropdown
        value={sort.columnId}
        columns={columns}
        onChange={handleColumnChange}
      />

      {/* Direction selector with custom dropdown */}
      <DirectionDropdown
        value={sort.direction}
        directions={directions}
        onChange={handleDirectionChange}
      />

      {/* Delete button */}
      <button
        onClick={() => onRemove(index)}
        className="ml-auto cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Remove sort"
      >
        <X size={14} />
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
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [autoSort, setAutoSort] = useState(true);
  
  // Track initial sorts when popover opens to detect actual changes
  const initialSortsRef = useRef<string>("");
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addSortPickerRef = useRef<HTMLDivElement>(null);

  // Use shared popover state
  const { isPopoverOpen, setOpenPopover } = useToolbarPopovers();
  const isOpen = isPopoverOpen("sort");

  // Get sort state directly from context (live updates!)
  const { sorts, addSort, updateSort, removeSort, saveConfig, isDirty } =
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

  // Calculate popover position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4,
        left: rect.right - 420, // 420px = w-105
      });
    }
  }, [isOpen]);

  // Capture initial sorts only when popover opens (not on every sort change)
  useEffect(() => {
    if (isOpen && !initialSortsRef.current) {
      // Only set initial state once when popover opens
      initialSortsRef.current = JSON.stringify(sorts);
    } else if (!isOpen) {
      // Reset when popover closes
      initialSortsRef.current = "";
    }
  }, [isOpen, sorts]);

  // Auto-save sorts with debouncing (500ms after last change)
  useEffect(() => {
    // Only auto-save if popover is open AND sorts have actually changed
    if (!isOpen) return;
    
    const currentSorts = JSON.stringify(sorts);
    const hasChanged = currentSorts !== initialSortsRef.current;
    
    if (!hasChanged) return; // Guard: Don't save if nothing changed

    const timer = setTimeout(() => {
      void saveConfig({ sorts });
      // Update initial state after saving
      initialSortsRef.current = currentSorts;
    }, 500);

    return () => clearTimeout(timer);
  }, [sorts, isOpen, saveConfig]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // Save immediately when closing if there are unsaved changes
        const currentSorts = JSON.stringify(sorts);
        const hasChanged = currentSorts !== initialSortsRef.current;
        
        if (hasChanged) {
          void saveConfig({ sorts });
        }
        
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
        className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs md:px-2 ${
          hasActiveSorts
            ? "bg-orange-100 text-black"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <ArrowDownUp size={16} />
        <span className="hidden md:inline">{getSortSummary()}</span>
      </button>

      {/* Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-105 rounded-lg border border-gray-200 bg-white shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            {/* Header */}
            <div className="px-2">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-600">
                    Sort by
                  </span>
                  <CircleQuestionMark size={14} className="text-gray-400" />
                </div>
                <div>
                  <button className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"></button>
                </div>
              </div>

              {/* Sort Rows */}
              <div className="px-3 py-2">
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
                  <div className="relative mt-1">
                    <button
                      onClick={() => setShowAddSortPicker(!showAddSortPicker)}
                      className="flex cursor-pointer items-center gap-1.5 rounded px-0 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <Plus size={14} />
                      <span>Add another sort</span>
                    </button>

                    {/* Dropdown picker for available columns */}
                    {showAddSortPicker && (
                      <div
                        ref={addSortPickerRef}
                        className="absolute top-full left-0 z-50 mt-1 w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
                      >
                        {/* Search input */}
                        <div className="border-b border-gray-200 p-2">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a field"
                            className="w-full rounded px-2 py-1.5 text-xs placeholder-gray-400 focus:outline-none"
                            autoFocus
                          />
                        </div>

                        {/* Column list */}
                        <div className="max-h-60 overflow-y-auto py-1">
                          {filteredAvailableColumns.map((col) => (
                            <button
                              key={col.id}
                              onClick={() => handlePickColumn(col.id)}
                              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-gray-900 hover:bg-gray-100"
                            >
                              {getFieldIcon(col.type)}
                              <span>{col.name}</span>
                            </button>
                          ))}
                          {filteredAvailableColumns.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-gray-400">
                              No fields found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-sort toggle */}
            <div className="border-t border-gray-200 bg-gray-100 px-3 py-3">
              <div className="flex items-center gap-2">
                <Toggle enabled={autoSort} onChange={setAutoSort} />
                <span className="text-xs text-gray-700">
                  Automatically sort records
                </span>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
