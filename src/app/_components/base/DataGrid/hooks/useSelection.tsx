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
  clearSelection: () => void;
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

  const selectCell = useCallback((position: CellPosition | null) => {
    setSelectedCell(position);
    setEditingCell(null);
  }, []);

  const startEditing = useCallback((position: CellPosition) => {
    setSelectedCell(position);
    setEditingCell(position);
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
    [selectedCell]
  );

  const isEditing = useCallback(
    (rowIndex: number, columnIndex: number) => {
      return (
        editingCell?.rowIndex === rowIndex &&
        editingCell?.columnIndex === columnIndex
      );
    },
    [editingCell]
  );

  const isRowSelected = useCallback(
    (rowIndex: number) => {
      return selectedCell?.rowIndex === rowIndex;
    },
    [selectedCell]
  );

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setEditingCell(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedCell || editingCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if we're in editing mode
      if (editingCell) return;

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

      if (newRow !== selectedCell.rowIndex || newCol !== selectedCell.columnIndex) {
        setSelectedCell({ rowIndex: newRow, columnIndex: newCol });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, editingCell, totalRows, totalColumns]);

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
        clearSelection,
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
