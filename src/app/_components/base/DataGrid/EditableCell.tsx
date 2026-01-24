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
  const [displayValue, setDisplayValue] = useState<string | number | null>(initialValue);
  const previousValueRef = useRef<string | number | null>(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const hasSavedRef = useRef(false);
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

  // Auto-focus input on edit mode and reset save flag
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      hasSavedRef.current = false;
    }
  }, [isEditing]);

  // Only sync with server changes from OTHER users/sessions
  // Don't overwrite our optimistic updates
  useEffect(() => {
    // Skip if we're currently editing
    if (isEditing) return;
    
    // Only update if the value actually changed from an external source
    // (not from our own optimistic update)
    if (initialValue !== previousValueRef.current && 
        initialValue !== displayValue) {
      setValue(String(initialValue ?? ""));
      setDisplayValue(initialValue);
    }
    
    previousValueRef.current = initialValue;
  }, [initialValue, isEditing, displayValue]);

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
  });

  const handleSave = () => {
    // Skip if already saved (e.g., from arrow key navigation)
    if (hasSavedRef.current) {
      stopEditing();
      return;
    }

    let finalValue: string | number | null = value;

    if (columnType === "NUMBER") {
      const numValue = parseFloat(value);
      if (value !== "" && !isNaN(numValue)) {
        finalValue = numValue;
      } else if (value === "") {
        finalValue = null;
      } else {
        setValue(String(initialValue ?? ""));
        setDisplayValue(initialValue);
        stopEditing();
        return;
      }
    } else if (value === "") {
      finalValue = null;
    }

    // Update display value immediately to prevent flashing
    setDisplayValue(finalValue);

    if (finalValue !== initialValue) {
      updateCellMutation.mutate({ rowId, columnId, value: finalValue });
    }

    hasSavedRef.current = true;
    stopEditing();
  };

  const handleCancel = () => {
    setValue(String(initialValue ?? ""));
    setDisplayValue(initialValue);
    stopEditing();
  };

  const handleSaveAndNavigate = (direction: "up" | "down" | "left" | "right") => {
    // Mark as saved to prevent double-save from blur
    hasSavedRef.current = true;

    // Save current value
    let finalValue: string | number | null = value;

    if (columnType === "NUMBER") {
      const numValue = parseFloat(value);
      if (value !== "" && !isNaN(numValue)) {
        finalValue = numValue;
      } else if (value === "") {
        finalValue = null;
      } else {
        setValue(String(initialValue ?? ""));
        setDisplayValue(initialValue);
        selectCell(null);
        return;
      }
    } else if (value === "") {
      finalValue = null;
    }

    // Update display value immediately to prevent flashing
    setDisplayValue(finalValue);

    if (finalValue !== initialValue) {
      updateCellMutation.mutate({ rowId, columnId, value: finalValue });
    }

    // Calculate new position and navigate
    let newRow = rowIndex;
    let newCol = columnIndex;

    switch (direction) {
      case "up":
        newRow = Math.max(0, rowIndex - 1);
        break;
      case "down":
        newRow = rowIndex + 1;
        break;
      case "left":
        newCol = Math.max(1, columnIndex - 1);
        break;
      case "right":
        newCol = columnIndex + 1;
        break;
    }

    selectCell({ rowIndex: newRow, columnIndex: newCol });
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
    // Arrow keys now just move cursor within input, no navigation
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    // Blur any active input first to trigger save
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
      // Wait for blur event to complete and save to happen before selecting new cell
      setTimeout(() => {
        selectCell({ rowIndex, columnIndex });
      }, 0);
    } else {
      selectCell({ rowIndex, columnIndex });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    startEditing({ rowIndex, columnIndex });
  };

  const handleBlur = () => {
    handleSave();
  };

  // Format display value
  const formattedDisplayValue =
    displayValue === null || displayValue === undefined
      ? ""
      : String(displayValue);

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
              {formattedDisplayValue || <span className="text-gray-400"></span>}
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
        {formattedDisplayValue || <span className="text-gray-400"></span>}
      </span>
    </div>
  );
}
