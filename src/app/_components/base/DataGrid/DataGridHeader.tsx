"use client";

import { type HeaderGroup, flexRender } from "@tanstack/react-table";
import type { RowData } from "./hooks/useTableColumns";

interface DataGridHeaderProps {
  headerGroups: HeaderGroup<RowData>[];
}

export function DataGridHeader({ headerGroups }: DataGridHeaderProps) {
  return (
    <thead className="sticky top-0 z-10 bg-gray-50">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className="overflow-hidden truncate border-b border-r border-gray-300 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-700"
              style={{
                width: header.getSize(),
                maxWidth: header.getSize(),
              }}
            >
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}
