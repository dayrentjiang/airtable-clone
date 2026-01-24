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
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    initialValue,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
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
    if (
      initialValue !== previousValueRef.current &&
      initialValue !== displayValue
    ) {
      setValue(String(initialValue ?? ""));
      setDisplayValue(initialValue);
    }

    previousValueRef.current = initialValue;
  }, [initialValue, isEditing, displayValue]);

  // Handle keyboard input when selected (not editing) - for typing characters
  useEffect(() => {
    if (!isSelected || isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Start editing on printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();

        // For NUMBER columns, validate before starting edit
        if (columnType === "NUMBER") {
          // Allow digits, decimal point, and minus sign
          if (/^[-0-9.]$/.test(e.key)) {
            setValue(e.key);
            setValidationError(null);
            startEditing({ rowIndex, columnIndex });
          } else {
            // Show error but don't enter edit mode
            setValidationError("Please enter a number");
            setTimeout(() => setValidationError(null), 2000);
          }
        } else {
          // TEXT column - allow any character
          setValue(e.key);
          setValidationError(null);
          startEditing({ rowIndex, columnIndex });
        }
      }
      // Backspace/Delete clears and enters edit mode
      else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setValue("");
        setValidationError(null);
        startEditing({ rowIndex, columnIndex });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, isEditing, rowIndex, columnIndex, startEditing, columnType]);

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

  const handleSaveAndNavigate = (
    direction: "up" | "down" | "left" | "right",
  ) => {
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
    e.stopPropagation();
    console.log("Cell clicked:", {
      rowIndex,
      columnIndex,
      isSelected,
      isEditing,
    });
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
      <>
        {/* Editing border - matches selection border exactly */}
        <div className="pointer-events-none absolute -inset-1 z-20 rounded-sm border-4 border-blue-600"></div>
        {/* Input */}
        <div className="absolute inset-0 z-10 overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              const newValue = e.target.value;

              // For NUMBER columns, validate input
              if (columnType === "NUMBER") {
                // Allow empty, or valid number patterns (including incomplete ones like "-", ".", "1.", "-5")
                // This regex allows: optional minus, optional digits, optional decimal, optional digits
                if (newValue === "" || /^-?\d*\.?\d*$/.test(newValue)) {
                  setValue(newValue);
                  setValidationError(null);
                } else {
                  // Don't update value, show error
                  setValidationError("Please enter a number");
                  setTimeout(() => setValidationError(null), 2000);
                }
              } else {
                // TEXT column - allow anything
                setValue(newValue);
                setValidationError(null);
              }
            }}
            onKeyDown={handleInputKeyDown}
            onBlur={handleBlur}
            className="h-full w-full bg-white px-2 py-1.5 text-sm outline-none"
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
        {/* Selection border */}
        <div className="pointer-events-none absolute -inset-0.5 z-20 rounded-sm border-3 border-blue-600">
          <div className="absolute -right-1 -bottom-1 h-2 w-2 border border-blue-500 bg-white" />
        </div>
        {/* Content */}
        <div
          ref={cellRef}
          className="absolute inset-0 cursor-default overflow-hidden px-2 py-1.5"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <span className="pointer-events-none block truncate text-sm text-gray-900">
            {formattedDisplayValue || <span className="text-gray-400"></span>}
          </span>
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
      className="absolute inset-0 cursor-default overflow-hidden px-2 py-1.5"
    >
      <span className="pointer-events-none block truncate text-sm text-gray-900">
        {formattedDisplayValue || <span className="text-gray-400"></span>}
      </span>
    </div>
  );
}
