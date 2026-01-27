"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSelection } from "../hooks/useSelection";
import { useContextMenu } from "../hooks/useContextMenu";
import { getCellHighlightClass } from "../utils/cellHighlight";
import type { Filter, Sort } from "~/server/lib/types";

type ColumnType = "TEXT" | "NUMBER";

interface DirectEditableCellProps {
  rowIndex: number;
  rowId: string;
  tableId: string;
  columnId: string;
  columnIndex: number;
  columnType: ColumnType;
  value: string | number | null;
  searchTerm?: string;
  filters?: Filter[];
  sorts?: Sort[];
}

/**
 * A simplified EditableCell that works directly with raw data
 * instead of requiring TanStack Table's cell context
 */
export function DirectEditableCell({
  rowIndex,
  rowId,
  tableId,
  columnId,
  columnIndex,
  columnType,
  value: initialValue,
  searchTerm,
  filters,
  sorts,
}: DirectEditableCellProps) {
  const [value, setValue] = useState(String(initialValue ?? ""));
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    initialValue,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const previousValueRef = useRef<string | number | null>(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const hasSavedRef = useRef(false);
  const utils = api.useUtils();

  const { showContextMenu } = useContextMenu();

  const {
    isSelected: checkIsSelected,
    isEditing: checkIsEditing,
    selectCell,
    startEditing,
    stopEditing,
    selectedRowIds,
    totalRows,
    totalColumns,
  } = useSelection();

  const isSelected = checkIsSelected(rowIndex, columnIndex);
  const isEditing = checkIsEditing(rowIndex, columnIndex);

  // Auto-focus input on edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      hasSavedRef.current = false;
    }
  }, [isEditing]);

  // Sync with external value changes
  useEffect(() => {
    if (isEditing) return;
    if (
      initialValue !== previousValueRef.current &&
      initialValue !== displayValue
    ) {
      setValue(String(initialValue ?? ""));
      setDisplayValue(initialValue);
    }
    previousValueRef.current = initialValue;
  }, [initialValue, isEditing, displayValue]);

  // Handle keyboard input when selected
  useEffect(() => {
    if (!isSelected || isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (columnType === "NUMBER") {
          if (/^[-0-9.]$/.test(e.key)) {
            setValue(e.key);
            setValidationError(null);
            startEditing({ rowIndex, columnIndex });
          } else {
            setValidationError("Please enter a number");
            setTimeout(() => setValidationError(null), 2000);
          }
        } else {
          setValue(e.key);
          setValidationError(null);
          startEditing({ rowIndex, columnIndex });
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        // Clear the cell value without entering editing mode
        updateCellMutation.mutate({
          rowId,
          columnId,
          value: null,
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, isEditing, rowIndex, columnIndex, startEditing, columnType]);

  const updateCellMutation = api.row.updateCell.useMutation({
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await utils.row.infiniteWithView.cancel();

      // Optimistically update the display value immediately
      if (variables.columnId === columnId && variables.rowId === rowId) {
        setDisplayValue(variables.value);
        setValue(variables.value?.toString() ?? "");
      }

      // Return context for potential rollback
      return { previousDisplayValue: displayValue };
    },
    onSuccess: () => {
      void utils.row.infiniteWithView.invalidate({ tableId });
    },
    onError: (err, _variables, context) => {
      console.error("Failed to update cell:", err);
      // Revert to original value on error
      if (context?.previousDisplayValue !== undefined) {
        setDisplayValue(context.previousDisplayValue);
        setValue(context.previousDisplayValue?.toString() ?? "");
      }
    },
  });

  const handleSave = () => {
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

  const handleSaveAndNavigate = (
    direction: "up" | "down" | "left" | "right",
  ) => {
    hasSavedRef.current = true;

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

    setDisplayValue(finalValue);

    if (finalValue !== initialValue) {
      updateCellMutation.mutate({ rowId, columnId, value: finalValue });
    }

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
        // Move left, or up and to last column
        if (columnIndex > 1) {
          newCol = columnIndex - 1;
        } else if (rowIndex > 0) {
          newRow = rowIndex - 1;
          newCol = totalColumns - 1;
        }
        break;
      case "right":
        // Move right, or down and to first data column
        if (columnIndex < totalColumns - 1) {
          newCol = columnIndex + 1;
        } else if (rowIndex < totalRows - 1) {
          newRow = rowIndex + 1;
          newCol = 1; // First data column (skip row number)
        }
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
      e.preventDefault();
      if (e.shiftKey) {
        handleSaveAndNavigate("left");
      } else {
        handleSaveAndNavigate("right");
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cellRef.current) {
      showContextMenu(
        cellRef.current,
        rowId,
        tableId,
        Array.from(selectedRowIds),
      );
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const formattedDisplayValue =
    displayValue === null || displayValue === undefined
      ? ""
      : String(displayValue);

  const highlightClass = getCellHighlightClass(
    displayValue,
    columnId,
    searchTerm ?? "",
    filters ?? [],
    sorts ?? [],
  );

  // Editing state
  if (isEditing) {
    return (
      <>
        <div className="pointer-events-none absolute -inset-1 z-20 rounded-sm border-3 border-blue-600"></div>
        <div className="absolute inset-0 z-10 flex items-center overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;
              if (columnType === "NUMBER") {
                if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
                  setValue(newValue);
                  setValidationError(null);
                } else {
                  setValidationError("Please enter a number");
                  setTimeout(() => setValidationError(null), 2000);
                }
              } else {
                setValue(newValue);
                setValidationError(null);
              }
            }}
            onKeyDown={handleInputKeyDown}
            onBlur={handleBlur}
            className="h-full w-full bg-white px-2 text-sm outline-none"
            placeholder={
              columnType === "NUMBER" ? "Enter number..." : "Enter text..."
            }
          />
          {validationError && (
            <div className="absolute top-full left-0 z-50 mt-1 rounded bg-red-50 px-2 py-1 text-xs whitespace-nowrap text-red-600 shadow-md">
              {validationError}
            </div>
          )}
        </div>
      </>
    );
  }

  // Selected state
  if (isSelected) {
    return (
      <>
        <div className="pointer-events-none absolute -inset-0.5 z-20 rounded-sm border-2 border-blue-600">
          <div className="absolute -right-1 -bottom-1 h-2 w-2 border border-blue-500 bg-white" />
        </div>
        <div
          ref={cellRef}
          className={`absolute inset-0 flex cursor-default items-center overflow-hidden px-2 ${highlightClass}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          <span className="pointer-events-none block truncate text-sm text-gray-900">
            {formattedDisplayValue || <span className="text-gray-400"></span>}
          </span>
        </div>
      </>
    );
  }

  // Default state
  return (
    <div
      ref={cellRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`absolute inset-0 flex cursor-default items-center overflow-hidden px-2 ${highlightClass}`}
    >
      <span className="pointer-events-none block truncate text-sm text-gray-900">
        {formattedDisplayValue || <span className="text-gray-400"></span>}
      </span>
    </div>
  );
}
