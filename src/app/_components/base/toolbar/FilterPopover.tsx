"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../hooks/useViewConfig";
import { useToolbarPopovers } from "../hooks/useToolbarPopovers";
import { api } from "~/trpc/react";
import type { Filter, FilterOperator } from "~/server/lib/types";

/**
 * FILTER POPOVER COMPONENT
 *
 * HOW FILTERING WORKS:
 *
 * 1. User clicks "Filter" button → opens this popover
 * 2. User selects column, operator, and types value
 * 3. After 300ms of no typing (debounce), filters are applied
 * 4. DataGrid re-queries with new filters
 * 5. Matching cells are highlighted green
 *
 * KEY PATTERN: Live Updates with Debounce
 * - Like search, filters apply automatically
 * - Debouncing prevents excessive API calls while typing
 */

// ---------------------------------------------------------------------------
// ICONS
// ---------------------------------------------------------------------------

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
// OPERATOR LABELS
// ---------------------------------------------------------------------------

const TEXT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "=" },
  { value: "not_equals", label: "≠" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "greater_or_equal", label: "≥" },
  { value: "less_or_equal", label: "≤" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

// Operators that don't need a value input
const NO_VALUE_OPERATORS: FilterOperator[] = ["is_empty", "is_not_empty"];

// ---------------------------------------------------------------------------
// FILTER ROW COMPONENT (with debounced value input)
// ---------------------------------------------------------------------------

interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
}

interface FilterRowProps {
  filter: Filter;
  index: number;
  columns: Column[];
  onUpdate: (index: number, filter: Filter) => void;
  onRemove: (index: number) => void;
  isFirst: boolean;
}

function FilterRow({
  filter,
  index,
  columns,
  onUpdate,
  onRemove,
  isFirst,
}: FilterRowProps) {
  // Local state for value input (for debouncing)
  const [localValue, setLocalValue] = useState(String(filter.value ?? ""));

  // Sync local value when filter changes externally
  useEffect(() => {
    setLocalValue(String(filter.value ?? ""));
  }, [filter.value]);

  // Find current column to determine type
  const currentColumn = columns.find((c) => c.id === filter.columnId);
  const columnType = currentColumn?.type ?? "TEXT";
  const operators = columnType === "NUMBER" ? NUMBER_OPERATORS : TEXT_OPERATORS;
  const needsValue = !NO_VALUE_OPERATORS.includes(filter.operator);

  // Debounce the value input - only update filter after 300ms of no typing
  useEffect(() => {
    if (!needsValue) return;

    const timer = setTimeout(() => {
      let parsedValue: string | number | undefined = localValue || undefined;

      // For number columns, parse as number
      if (columnType === "NUMBER" && localValue !== "") {
        const num = parseFloat(localValue);
        if (!isNaN(num)) {
          parsedValue = num;
        }
      }

      // Only update if value actually changed
      if (parsedValue !== filter.value) {
        onUpdate(index, { ...filter, value: parsedValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, needsValue, columnType, filter, index, onUpdate]);

  const handleColumnChange = (columnId: string) => {
    const newColumn = columns.find((c) => c.id === columnId);
    const newType = newColumn?.type ?? "TEXT";

    // If switching column types, reset to first operator of new type
    const newOperators =
      newType === "NUMBER" ? NUMBER_OPERATORS : TEXT_OPERATORS;
    const operatorValid = newOperators.some(
      (op) => op.value === filter.operator,
    );

    onUpdate(index, {
      ...filter,
      columnId,
      operator: operatorValid ? filter.operator : newOperators[0]!.value,
      value: undefined, // Reset value when column changes
    });
    setLocalValue("");
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    const needsValueNow = !NO_VALUE_OPERATORS.includes(operator);

    onUpdate(index, {
      ...filter,
      operator,
      // Clear value if switching to an operator that doesn't need it
      // Apply immediately for operators that don't need value
      value: needsValueNow ? filter.value : undefined,
    });

    if (!needsValueNow) {
      setLocalValue("");
    }
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Where / And label */}
      <span className="w-12 text-xs text-gray-500">
        {isFirst ? "Where" : "and"}
      </span>

      {/* Column selector */}
      <div className="relative">
        <select
          value={filter.columnId}
          onChange={(e) => handleColumnChange(e.target.value)}
          className="h-7 w-28 cursor-pointer appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
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

      {/* Operator selector */}
      <div className="relative">
        <select
          value={filter.operator}
          onChange={(e) =>
            handleOperatorChange(e.target.value as FilterOperator)
          }
          className="h-7 w-32 cursor-pointer appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-gray-400">
          <ChevronDownIcon />
        </div>
      </div>

      {/* Value input (only if operator needs it) - uses local state for debouncing */}
      {needsValue && (
        <input
          type={columnType === "NUMBER" ? "number" : "text"}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Enter a value"
          className="h-7 w-32 rounded border border-gray-300 px-2 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
        />
      )}

      {/* Delete button */}
      <button
        onClick={() => onRemove(index)}
        className="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Remove filter"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FILTER POPOVER COMPONENT
// ---------------------------------------------------------------------------

interface FilterPopoverProps {
  tableId: string;
}

export function FilterPopover({ tableId }: FilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use shared popover state
  const { isPopoverOpen, setOpenPopover } = useToolbarPopovers();
  const isOpen = isPopoverOpen("filter");

  // Get filter state directly from context (no draft state - live updates!)
  const { filters, addFilter, updateFilter, removeFilter, saveConfig } =
    useViewConfig();

  // Fetch columns for this table
  const { data: table } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId },
  );

  const columns: Column[] = table?.columns ?? [];

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
        void saveConfig({ filters });
        setOpenPopover(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, filters, saveConfig, setOpenPopover]);

  // Add a new filter with default values
  const handleAddFilter = () => {
    if (columns.length === 0) return;

    const firstColumn = columns[0]!;
    const defaultOperator: FilterOperator =
      firstColumn.type === "NUMBER" ? "equals" : "contains";

    addFilter({
      columnId: firstColumn.id,
      operator: defaultOperator,
      value: undefined,
    });
  };

  // Helper to check if a filter is complete
  const NO_VALUE_OPERATORS: FilterOperator[] = ["is_empty", "is_not_empty"];
  const completeFilters = filters.filter((f) => {
    return (
      NO_VALUE_OPERATORS.includes(f.operator) ||
      (f.value !== undefined && f.value !== null && f.value !== "")
    );
  });

  // Check if filters are active (only complete filters count)
  const hasActiveFilters = completeFilters.length > 0;

  // Generate filter summary for button text
  // Example: "Filter by Name, Price > 100"
  const getFilterSummary = () => {
    if (completeFilters.length === 0) return "Filter";

    // Get column names for complete filters
    const filterNames = completeFilters
      .map((f) => {
        const col = columns.find((c) => c.id === f.columnId);
        return col?.name;
      })
      .filter(Boolean);

    if (filterNames.length === 0) return "Filter";

    // Show up to 2 filter names, then "..."
    if (filterNames.length <= 2) {
      return `Filter by ${filterNames.join(", ")}`;
    } else {
      return `Filter by ${filterNames.slice(0, 2).join(", ")}, ...`;
    }
  };

  return (
    <div className="relative">
      {/* Filter button */}
      <button
        ref={buttonRef}
        onClick={() => setOpenPopover(isOpen ? null : "filter")}
        className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs md:px-2 ${
          hasActiveFilters
            ? "bg-green-100 text-black"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <FilterIcon />
        <span className="hidden md:inline">{getFilterSummary()}</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 z-50 mt-1 min-w-105 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {/* Header */}
          <div className="border-b border-gray-100 px-4 py-3 text-xs text-gray-500">
            In this view, show records
          </div>

          {/* Filter rows */}
          <div className="px-4 py-2">
            {filters.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                No filters applied. Add a condition to filter records.
              </div>
            ) : (
              <div className="space-y-1">
                {filters.map((filter, index) => (
                  <FilterRow
                    key={index}
                    filter={filter}
                    index={index}
                    columns={columns}
                    onUpdate={updateFilter}
                    onRemove={removeFilter}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            )}

            {/* Add condition button */}
            <div className="mt-3 pt-2">
              <button
                onClick={handleAddFilter}
                disabled={columns.length === 0}
                className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <PlusIcon />
                <span>Add condition</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
