"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../_state/view-config";
import { useToolbarPopovers } from "./hooks/useToolbarPopovers";
import { api } from "~/trpc/react";
import type { Filter, FilterOperator } from "~/server/lib/types";
import {
  ListFilter as FilterIcon,
  Trash2,
  Plus,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { createPortal } from "react-dom";

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
    <div className="flex items-center px-3 py-1.5">
      {/* Where / And label */}
      <span className="w-12 shrink-0 text-xs text-gray-800">
        {isFirst ? "Where" : "and"}
      </span>

      {/* Column selector */}
      <div className="relative shrink-0">
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
        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400">
          <ChevronDown size={12} />
        </div>
      </div>

      {/* Operator selector */}
      <div className="relative shrink-0">
        <select
          value={filter.operator}
          onChange={(e) =>
            handleOperatorChange(e.target.value as FilterOperator)
          }
          className="h-7 w-28 cursor-pointer appearance-none rounded border border-gray-300 bg-white px-2 pr-6 text-xs focus:border-blue-500 focus:outline-none"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400">
          <ChevronDown size={12} />
        </div>
      </div>

      {/* Value input (only if operator needs it) - uses local state for debouncing */}
      {needsValue && (
        <input
          type={columnType === "NUMBER" ? "number" : "text"}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Enter a value"
          className="h-7 min-w-0 flex-1 rounded border border-gray-300 px-2 text-xs placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
        />
      )}

      {/* Delete button */}
      <button
        onClick={() => onRemove(index)}
        className="shrink-0 cursor-pointer rounded border border-gray-300 p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        title="Remove filter"
      >
        <Trash2 size={14} />
      </button>

      {/* Drag handle */}
      <button
        className="shrink-0 cursor-grab rounded text-gray-300 hover:text-gray-400"
        title="Reorder"
      >
        <GripVertical size={16} />
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
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

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

  // Calculate popover position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4,
        left: rect.right - 560, // 560px = w-140
      });
    }
  }, [isOpen]);

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
        <FilterIcon size={16} />
        <span className="hidden md:inline">{getFilterSummary()}</span>
      </button>

      {/* Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="w-140 fixed z-50 rounded-md border border-gray-300/60 bg-white py-2 shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
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
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  <Plus size={14} />
                  <span>Add condition</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
