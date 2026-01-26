"use client";

import { useRef, useMemo } from "react";
import { type HeaderGroup, flexRender } from "@tanstack/react-table";
import type { RowData } from "./hooks/useTableColumns";
import { useSelection } from "./hooks/useSelection";
import { useContextMenu } from "./hooks/useContextMenu";
import type { Filter, Sort } from "~/server/lib/types";

interface DataGridHeaderProps {
  headerGroups: HeaderGroup<RowData>[];
  tableId: string;
  filters: Filter[];
  sorts: Sort[];
}

export function DataGridHeader({
  headerGroups,
  tableId,
  filters,
  sorts,
}: DataGridHeaderProps) {
  const { isColumnSelected, toggleColumnSelection } = useSelection();
  const { showColumnContextMenu } = useContextMenu();
  const headerRefs = useRef<Map<string, HTMLTableHeaderCellElement>>(new Map());

  // Create a set of column IDs that have filters applied
  const filteredColumnIds = useMemo(() => {
    return new Set(filters.map((f) => f.columnId));
  }, [filters]);

  // Create a set of column IDs that have sorts applied
  const sortedColumnIds = useMemo(() => {
    return new Set(sorts.map((s) => s.columnId));
  }, [sorts]);

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
            const hasFilter = filteredColumnIds.has(columnId);
            const hasSort = sortedColumnIds.has(columnId);

            // Determine background color - prioritize filter over sort
            let bgClasses = "";
            if (isSelected) {
              bgClasses = "cursor-pointer bg-blue-100";
            } else if (hasFilter) {
              // Filter: green background
              bgClasses = "cursor-pointer bg-green-50 hover:bg-green-100";
            } else if (hasSort) {
              // Sort: orange background
              bgClasses = "cursor-pointer bg-orange-50 hover:bg-orange-100";
            } else if (columnIndex > 0) {
              // Normal column
              bgClasses = "cursor-pointer bg-gray-50 hover:bg-gray-100";
            } else {
              // Row number column (index 0)
              bgClasses = "bg-gray-50";
            }

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
                onContextMenu={(e) =>
                  handleContextMenu(e, columnId, columnIndex)
                }
                className={`truncate overflow-hidden border-r border-b border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-700 ${bgClasses}`}
                style={{
                  width: header.getSize(),
                  maxWidth: header.getSize(),
                }}
              >
                {/* Row number column (index 0) should always be empty */}
                {columnIndex === 0
                  ? null
                  : header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
