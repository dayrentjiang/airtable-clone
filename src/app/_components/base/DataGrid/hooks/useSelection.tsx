"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface CellPosition {
  rowIndex: number;
  columnIndex: number;
}

interface SelectionContextValue {
  selectedCell: CellPosition | null;
  editingCell: CellPosition | null;
  selectCell: (position: CellPosition | null) => void;
  startEditing: (position: CellPosition) => void;
  stopEditing: () => void;
  isSelected: (rowIndex: number, columnIndex: number) => boolean;
  isEditing: (rowIndex: number, columnIndex: number) => boolean;
  isRowSelected: (rowIndex: number) => boolean;
  isColumnSelected: (columnIndex: number) => boolean;
  toggleRowSelection: (
    rowIndex: number,
    rowId: string,
    isShiftKey?: boolean,
  ) => void;
  toggleColumnSelection: (columnIndex: number, isShiftKey?: boolean) => void;
  clearSelection: () => void;
  selectedRows: Set<number>; // Row indices for UI highlighting
  selectedRowIds: Set<string>; // Row IDs for operations like delete
  selectedColumns: Set<number>;
  totalRows: number;
  totalColumns: number;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

interface SelectionProviderProps {
  children: ReactNode;
  totalRows: number;
  totalColumns: number;
}

export function SelectionProvider({
  children,
  totalRows,
  totalColumns,
}: SelectionProviderProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(
    new Set(),
  );

  const selectCell = useCallback((position: CellPosition | null) => {
    setSelectedCell(position);
    setEditingCell(null);
    // Clear row and column selections when selecting a cell
    if (position !== null) {
      setSelectedRows(new Set());
      setSelectedRowIds(new Set());
      setSelectedColumns(new Set());
    }
  }, []);

  const startEditing = useCallback((position: CellPosition) => {
    setSelectedCell(position);
    setEditingCell(position);
    // Clear row and column selections when starting to edit a cell
    setSelectedRows(new Set());
    setSelectedRowIds(new Set());
    setSelectedColumns(new Set());
  }, []);

  const stopEditing = useCallback(() => {
    setEditingCell(null);
  }, []);

  const isSelected = useCallback(
    (rowIndex: number, columnIndex: number) => {
      return (
        selectedCell?.rowIndex === rowIndex &&
        selectedCell?.columnIndex === columnIndex
      );
    },
    [selectedCell],
  );

  const isEditing = useCallback(
    (rowIndex: number, columnIndex: number) => {
      return (
        editingCell?.rowIndex === rowIndex &&
        editingCell?.columnIndex === columnIndex
      );
    },
    [editingCell],
  );

  const isRowSelected = useCallback(
    (rowIndex: number) => {
      return selectedRows.has(rowIndex);
    },
    [selectedRows],
  );

  const isColumnSelected = useCallback(
    (columnIndex: number) => {
      return selectedColumns.has(columnIndex);
    },
    [selectedColumns],
  );

  const toggleRowSelection = useCallback(
    (rowIndex: number, rowId: string, isShiftKey = false) => {
      // Clear cell selection when selecting rows
      setSelectedCell(null);
      setEditingCell(null);

      // Update row indices (for UI highlighting)
      setSelectedRows((prev) => {
        // Always toggle for rows (no shift needed for multi-select)
        const newSet = new Set(prev);
        if (newSet.has(rowIndex)) {
          newSet.delete(rowIndex);
        } else {
          newSet.add(rowIndex);
        }
        return newSet;
      });

      // Update row IDs (for operations like delete)
      setSelectedRowIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(rowId)) {
          newSet.delete(rowId);
        } else {
          newSet.add(rowId);
        }
        return newSet;
      });

      // Clear column selection only when NOT holding Shift (to allow mixed selection)
      if (!isShiftKey) {
        setSelectedColumns(new Set());
      }
    },
    [],
  );

  const toggleColumnSelection = useCallback(
    (columnIndex: number, isShiftKey = false) => {
      // Clear cell selection when selecting columns
      setSelectedCell(null);
      setEditingCell(null);

      setSelectedColumns((prev) => {
        if (isShiftKey) {
          // Shift key: Add to selection (multi-select)
          const newSet = new Set(prev);
          if (newSet.has(columnIndex)) {
            newSet.delete(columnIndex);
          } else {
            newSet.add(columnIndex);
          }
          return newSet;
        } else {
          // No shift: Single selection (replace)
          if (prev.has(columnIndex) && prev.size === 1) {
            // Clicking the only selected column deselects it
            return new Set();
          } else {
            return new Set([columnIndex]);
          }
        }
      });
      // Clear row selection only when NOT holding Shift (to allow mixed selection)
      if (!isShiftKey) {
        setSelectedRows(new Set());
        setSelectedRowIds(new Set());
      }
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setEditingCell(null);
    setSelectedRows(new Set());
    setSelectedRowIds(new Set());
    setSelectedColumns(new Set());
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedCell || editingCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if we're in editing mode
      if (editingCell) return;

      // Skip if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      let newRow = selectedCell.rowIndex;
      let newCol = selectedCell.columnIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newRow = Math.max(0, selectedCell.rowIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newRow = Math.min(totalRows - 1, selectedCell.rowIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          // Skip column 0 (row number column)
          newCol = Math.max(1, selectedCell.columnIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newCol = Math.min(totalColumns - 1, selectedCell.columnIndex + 1);
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            // Move left, or up and to last column
            if (selectedCell.columnIndex > 1) {
              newCol = selectedCell.columnIndex - 1;
            } else if (selectedCell.rowIndex > 0) {
              newRow = selectedCell.rowIndex - 1;
              newCol = totalColumns - 1;
            }
          } else {
            // Move right, or down and to first data column
            if (selectedCell.columnIndex < totalColumns - 1) {
              newCol = selectedCell.columnIndex + 1;
            } else if (selectedCell.rowIndex < totalRows - 1) {
              newRow = selectedCell.rowIndex + 1;
              newCol = 1; // First data column (skip row number)
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          // Start editing current cell
          if (selectedCell.columnIndex > 0) {
            setEditingCell(selectedCell);
          }
          return;
        case "Escape":
          e.preventDefault();
          setSelectedCell(null);
          return;
        default:
          return;
      }

      if (
        newRow !== selectedCell.rowIndex ||
        newCol !== selectedCell.columnIndex
      ) {
        setSelectedCell({ rowIndex: newRow, columnIndex: newCol });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, editingCell, totalRows, totalColumns]);

  // Click outside handler - clear all selections when clicking outside the grid
  useEffect(() => {
    // Only add listener if there's any active selection
    if (
      !selectedCell &&
      selectedRows.size === 0 &&
      selectedColumns.size === 0
    ) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is inside a table cell or header
      const isInsideCell = target.closest("td") !== null;
      const isInsideHeader = target.closest("th") !== null;
      const isInsideTable = isInsideCell || isInsideHeader;

      // Don't clear if clicking inside the table or if editing
      if (isInsideTable || editingCell) {
        return;
      }

      // Clear all selections when clicking outside the table
      setSelectedCell(null);
      setSelectedRows(new Set());
      setSelectedRowIds(new Set());
      setSelectedColumns(new Set());
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCell, selectedRows, selectedColumns, editingCell]);

  return (
    <SelectionContext.Provider
      value={{
        selectedCell,
        editingCell,
        selectCell,
        startEditing,
        stopEditing,
        isSelected,
        isEditing,
        isRowSelected,
        isColumnSelected,
        toggleRowSelection,
        toggleColumnSelection,
        clearSelection,
        selectedRows,
        selectedRowIds,
        selectedColumns,
        totalRows,
        totalColumns,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
