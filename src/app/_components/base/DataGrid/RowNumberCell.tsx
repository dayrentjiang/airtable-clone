"use client";

import { useState, useRef } from "react";
import { useSelection } from "./hooks/useSelection";
import { useContextMenu } from "./hooks/useContextMenu";

interface RowNumberCellProps {
  rowIndex: number;
  rowNumber: number;
  rowId: string;
  tableId: string;
}

export function RowNumberCell({
  rowIndex,
  rowNumber,
  rowId,
  tableId,
}: RowNumberCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const { isRowSelected, toggleRowSelection, selectedRowIds } = useSelection();
  const { showContextMenu } = useContextMenu();
  const selected = isRowSelected(rowIndex);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleRowSelection(rowIndex, rowId, e.shiftKey);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cellRef.current) {
      // Pass selected row IDs for bulk operations
      showContextMenu(
        cellRef.current,
        rowId,
        tableId,
        Array.from(selectedRowIds),
      );
    }
  };

  return (
    <>
      <div
        ref={cellRef}
        className="flex h-full w-full items-center justify-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
      >
        {/* Show checkbox on hover or when selected */}
        {isHovered || selected ? (
          <button
            onClick={handleClick}
            className="flex h-4 w-4 items-center justify-center rounded border border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            style={{
              backgroundColor: selected ? "#3b82f6" : "white",
              borderColor: selected ? "#3b82f6" : undefined,
            }}
          >
            {selected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <polyline points="3,8 6,11 13,4" />
              </svg>
            )}
          </button>
        ) : (
          <span className="text-xs text-gray-500">{rowNumber}</span>
        )}
      </div>
    </>
  );
}
