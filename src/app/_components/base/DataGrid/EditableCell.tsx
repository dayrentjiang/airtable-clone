"use client";

import { useState, useRef, useEffect } from "react";
import { type CellContext } from "@tanstack/react-table";
import { api } from "~/trpc/react";
import { type RowData } from "./hooks/useTableColumns";
import { useSelection } from "./hooks/useSelection";

type ColumnType = "TEXT" | "NUMBER";

interface EditableCellProps extends CellContext<RowData, unknown> {
  columnType: ColumnType;
  columnId: string;
  columnIndex: number;
}

export function EditableCell({
  row,
  getValue,
  columnType,
  columnId,
  columnIndex,
}: EditableCellProps) {
  const initialValue = getValue() as string | number | null;
  const [value, setValue] = useState(String(initialValue ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  const {
    isSelected: checkIsSelected,
    isEditing: checkIsEditing,
    selectCell,
    startEditing,
    stopEditing,
  } = useSelection();

  const rowIndex = row.index;
  const isSelected = checkIsSelected(rowIndex, columnIndex);
  const isEditing = checkIsEditing(rowIndex, columnIndex);

  const tableId = row.original.tableId;
  const rowId = row.original.id;

  // Auto-focus input on edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Sync with external changes
  useEffect(() => {
    setValue(String(initialValue ?? ""));
  }, [initialValue]);

  // Handle keyboard input when selected (not editing) - for typing characters
  useEffect(() => {
    if (!isSelected || isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Start editing on printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setValue(e.key);
        startEditing({ rowIndex, columnIndex });
      }
      // Backspace/Delete clears and enters edit mode
      else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setValue("");
        startEditing({ rowIndex, columnIndex });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, isEditing, rowIndex, columnIndex, startEditing]);

  const updateCellMutation = api.row.updateCell.useMutation({
    onMutate: async (variables) => {
      await utils.row.infinite.cancel({ tableId });
      const previousData = utils.row.infinite.getInfiniteData({ tableId });

      utils.row.infinite.setInfiniteData({ tableId, limit: 50 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((r) => {
              if (r.id !== rowId) return r;
              const currentData = r.data as Record<string, unknown> | null;
              const updatedData = {
                ...(currentData ?? {}),
                [columnId]: variables.value,
              };
              return { ...r, data: updatedData as typeof r.data };
            }),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        utils.row.infinite.setInfiniteData(
          { tableId, limit: 50 },
          context.previousData,
        );
      }
      console.error("Failed to update cell:", err);
    },
    onSettled: () => {
      void utils.row.infinite.invalidate({ tableId });
    },
  });

  const handleSave = () => {
    let finalValue: string | number | null = value;

    if (columnType === "NUMBER") {
      const numValue = parseFloat(value);
      if (value !== "" && !isNaN(numValue)) {
        finalValue = numValue;
      } else if (value === "") {
        finalValue = null;
      } else {
        setValue(String(initialValue ?? ""));
        stopEditing();
        return;
      }
    } else if (value === "") {
      finalValue = null;
    }

    if (finalValue !== initialValue) {
      updateCellMutation.mutate({ rowId, columnId, value: finalValue });
    }

    stopEditing();
  };

  const handleCancel = () => {
    setValue(String(initialValue ?? ""));
    stopEditing();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Tab") {
      handleSave();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    selectCell({ rowIndex, columnIndex });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startEditing({ rowIndex, columnIndex });
  };

  const handleBlur = () => {
    handleSave();
  };

  const displayValue =
    initialValue === null || initialValue === undefined
      ? ""
      : String(initialValue);

  // Editing state
  if (isEditing) {
    return (
      <div className="absolute inset-0 z-10 overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}
          className="h-full w-full rounded-sm border-2 border-blue-600 bg-white px-2 py-1.5 text-sm outline-none"
          placeholder={
            columnType === "NUMBER" ? "Enter number..." : "Enter text..."
          }
        />
      </div>
    );
  }

  // Selected state
  if (isSelected) {
    return (
      <>
        {/* Selection border */}
        <div className="pointer-events-none absolute -inset-0.5 z-20 rounded-sm border-2 border-blue-600">
          <div className="absolute -right-1 -bottom-1 h-2 w-2 border border-blue-600 bg-white" />
        </div>
        {/* Content */}
        <div
          ref={cellRef}
          className="absolute inset-0 z-10 bg-white"
          onDoubleClick={handleDoubleClick}
        >
          <div className="h-full w-full overflow-hidden px-2 py-1.5">
            <span className="block truncate text-sm text-gray-900">
              {displayValue || <span className="text-gray-400"></span>}
            </span>
          </div>
        </div>
      </>
    );
  }

  // Default state - use absolute positioning to ensure click covers entire td
  return (
    <div
      ref={cellRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="absolute inset-0 overflow-hidden px-2 py-1.5"
    >
      <span className="block truncate text-sm text-gray-900">
        {displayValue || <span className="text-gray-400"></span>}
      </span>
    </div>
  );
}
