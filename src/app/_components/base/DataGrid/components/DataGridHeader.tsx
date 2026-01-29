"use client";

import { useRef, useMemo } from "react";
import { type HeaderGroup, flexRender } from "@tanstack/react-table";
import type { RowData } from "../hooks/useTableColumns";
import { useSelection } from "../hooks/useSelection";
import { useContextMenu } from "../hooks/useContextMenu";
import type { Filter, Sort } from "~/server/lib/types";

interface DataGridHeaderProps {
  headerGroups: HeaderGroup<RowData>[];
  tableId: string;
  filters: Filter[];
  sorts: Sort[];
  rowsByIndex: Map<number, RowData>; // All loaded rows for select all functionality
}

export function DataGridHeader({
  headerGroups,
  tableId,
  filters,
  sorts,
  rowsByIndex,
}: DataGridHeaderProps) {
  const {
    isColumnSelected,
    toggleColumnSelection,
    selectedRows,
    selectAllRows,
    deselectAllRows,
  } = useSelection();
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
    <thead className="sticky top-0 z-20 bg-gray-50">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header, columnIndex) => {
            const isSelected = isColumnSelected(columnIndex);
            const columnId = header.column.id;
            const hasFilter = filteredColumnIds.has(columnId);
            const hasSort = sortedColumnIds.has(columnId);

            // Check if all rows are selected (checkbox is fully checked, not indeterminate)
            const allRowsSelected =
              selectedRows.size > 0 &&
              selectedRows.size === rowsByIndex.size &&
              rowsByIndex.size > 0; // Ensure we have rows loaded

            // Determine background color - prioritize filter over sort
            let bgClasses = "";
            if (allRowsSelected && columnIndex === 0) {
              // When all rows are selected, highlight the checkbox header in blue
              bgClasses = "bg-blue-100";
            } else if (allRowsSelected && columnIndex > 0) {
              // When all rows are selected, highlight all data column headers in blue
              bgClasses = "cursor-pointer bg-blue-100";
            } else if (columnIndex === 0) {
              // Row number column - stay gray when some (but not all) rows are selected
              bgClasses = "bg-gray-50";
            } else if (isSelected) {
              bgClasses = "cursor-pointer bg-blue-100";
            } else if (hasFilter) {
              // Filter: green background
              bgClasses = "cursor-pointer bg-green-50 hover:bg-green-100";
            } else if (hasSort) {
              // Sort: orange background
              bgClasses = "cursor-pointer bg-orange-50 hover:bg-orange-100";
            } else {
              // Normal column
              bgClasses = "cursor-pointer bg-gray-50 hover:bg-gray-100";
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
                className={`group truncate overflow-hidden border-r border-b border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-700 ${bgClasses}`}
                style={{
                  width: header.getSize(),
                  maxWidth: header.getSize(),
                  ...(columnIndex === 0 && {
                    position: "sticky" as const,
                    left: 0,
                    zIndex: 40,
                  }),
                }}
              >
                {/* Row number column (index 0) has a checkbox */}
                {columnIndex === 0 ? (
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={
                        selectedRows.size > 0 &&
                        selectedRows.size === rowsByIndex.size
                      }
                      onChange={(e) => {
                        e.stopPropagation();

                        if (selectedRows.size > 0) {
                          // If any rows are selected, deselect all
                          deselectAllRows();
                        } else {
                          // Select all loaded rows
                          const allRows = Array.from(rowsByIndex.entries()).map(
                            ([index, row]) => ({
                              index,
                              id: row.id,
                            }),
                          );
                          selectAllRows(allRows);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : header.isPlaceholder ? null : (
                  <div 
                    className="flex items-center justify-between gap-2"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const headerElement = headerRefs.current.get(columnId);
                      if (headerElement) {
                        showColumnContextMenu(headerElement, columnId, tableId, true);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600">
                        {(
                          header.column.columnDef.meta as
                            | { type?: "TEXT" | "NUMBER" }
                            | undefined
                        )?.type === "NUMBER"
                          ? "#"
                          : "A"}
                      </span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </div>
                    <svg
                      onClick={(e) => {
                        e.stopPropagation();
                        const headerElement = headerRefs.current.get(columnId);
                        if (headerElement) {
                          showColumnContextMenu(
                            headerElement,
                            columnId,
                            tableId,
                          );
                        }
                      }}
                      className="h-4 w-4 shrink-0 cursor-pointer text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}
