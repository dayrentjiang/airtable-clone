"use client";

import { type Table, flexRender } from "@tanstack/react-table";
import { type VirtualItem } from "@tanstack/react-virtual";
import { DataGridHeader } from "./DataGridHeader";
import { AddRowButton } from "./AddRowButton";
import type { RowData } from "./hooks/useTableColumns";
import { useSelection } from "./hooks/useSelection";

interface DataGridTableProps {
  table: Table<RowData>;
  tableId: string;
  viewId: string;
  virtualRows: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  columnCount: number;
  tableWidth: number;
}

export function DataGridTable({
  table,
  tableId,
  viewId,
  virtualRows,
  paddingTop,
  paddingBottom,
  columnCount,
  tableWidth,
}: DataGridTableProps) {
  const { rows: tableRows } = table.getRowModel();
  const { isRowSelected } = useSelection();

  return (
    <table
      className="border-collapse"
      style={{ tableLayout: "fixed", width: tableWidth }}
    >
      <DataGridHeader headerGroups={table.getHeaderGroups()} />

      <tbody className="bg-white">
        {/* Top padding for virtualization */}
        {paddingTop > 0 && (
          <tr>
            <td style={{ height: `${paddingTop}px` }} />
          </tr>
        )}

        {/* Visible rows */}
        {virtualRows.map((virtualRow) => {
          const row = tableRows[virtualRow.index];
          if (!row) return null;

          return (
            <tr
              key={row.id}
              className={`hover:bg-gray-50 ${isRowSelected(row.index) ? "bg-gray-50" : ""}`}
              style={{ height: `${virtualRow.size}px` }}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="relative border-r border-b border-gray-200"
                  style={{
                    width: cell.column.getSize(),
                    maxWidth: cell.column.getSize(),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          );
        })}

        {/* Bottom padding for virtualization */}
        {paddingBottom > 0 && (
          <tr>
            <td style={{ height: `${paddingBottom}px` }} />
          </tr>
        )}

        {/* Loading indicator removed - background fetching is silent for seamless UX */}

        {/* Add row button */}
        <tr>
          <td colSpan={columnCount} className="border-r border-gray-200 p-0">
            <AddRowButton tableId={tableId} viewId={viewId} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
