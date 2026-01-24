"use client";

import { type Table, flexRender } from "@tanstack/react-table";
import { type VirtualItem } from "@tanstack/react-virtual";
import { DataGridHeader } from "./DataGridHeader";
import { AddRowButton } from "./AddRowButton";
import type { RowData } from "./hooks/useTableColumns";

interface DataGridTableProps {
  table: Table<RowData>;
  tableId: string;
  virtualRows: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  isFetchingNextPage: boolean;
  columnCount: number;
}

export function DataGridTable({
  table,
  tableId,
  virtualRows,
  paddingTop,
  paddingBottom,
  isFetchingNextPage,
  columnCount,
}: DataGridTableProps) {
  const { rows: tableRows } = table.getRowModel();

  return (
    <table className="w-full border-collapse">
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
              className="hover:bg-blue-50"
              style={{ height: `${virtualRow.size}px` }}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-b border-r border-gray-200 px-2 py-2 text-sm text-gray-900"
                  style={{ width: cell.column.getSize() }}
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

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <tr>
            <td
              colSpan={columnCount}
              className="border-b border-r border-gray-200 px-2 py-4 text-center text-sm text-gray-500"
            >
              Loading more...
            </td>
          </tr>
        )}

        {/* Add row button */}
        <tr>
          <td colSpan={columnCount} className="p-0">
            <AddRowButton tableId={tableId} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
