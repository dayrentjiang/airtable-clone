"use client";

import { useRef } from "react";
import { type HeaderGroup, flexRender } from "@tanstack/react-table";
import type { RowData } from "./hooks/useTableColumns";
import { useSelection } from "./hooks/useSelection";
import { useContextMenu } from "./hooks/useContextMenu";

interface DataGridHeaderProps {
  headerGroups: HeaderGroup<RowData>[];
  tableId: string;
}

export function DataGridHeader({ headerGroups, tableId }: DataGridHeaderProps) {
  const { isColumnSelected, toggleColumnSelection } = useSelection();
  const { showColumnContextMenu } = useContextMenu();
  const headerRefs = useRef<Map<string, HTMLTableHeaderCellElement>>(new Map());

  const handleContextMenu = (
    e: React.MouseEvent,
    columnId: string,
    columnIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't show context menu for row number column (index 0)
    if (columnIndex === 0) return;

    const headerElement = headerRefs.current.get(columnId);
    if (headerElement) {
      showColumnContextMenu(headerElement, columnId, tableId);
    }
  };

  return (
    <thead className="sticky top-0 z-10 bg-gray-50">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header, columnIndex) => {
            const isSelected = isColumnSelected(columnIndex);
            const columnId = header.column.id;

            return (
              <th
                key={header.id}
                ref={(el) => {
                  if (el) {
                    headerRefs.current.set(columnId, el);
                  } else {
                    headerRefs.current.delete(columnId);
                  }
                }}
                onClick={(e) => {
                  // Don't allow selecting the row number column (index 0)
                  if (columnIndex > 0) {
                    toggleColumnSelection(columnIndex, e.shiftKey);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, columnId, columnIndex)}
                className={`truncate overflow-hidden border-r border-b border-gray-300 px-2 py-2 text-left text-xs font-semibold text-gray-700 ${
                  isSelected
                    ? "cursor-pointer bg-blue-100"
                    : columnIndex > 0
                      ? "cursor-pointer bg-gray-50 hover:bg-gray-100"
                      : "bg-gray-50"
                }`}
                style={{
                  width: header.getSize(),
                  maxWidth: header.getSize(),
                }}
              >
                {/* Row number column (index 0) should always be empty */}
                {columnIndex === 0 ? null : (
                  header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
