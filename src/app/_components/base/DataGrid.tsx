"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";

interface DataGridProps {
  tableId: string;
}

interface RowData {
  id: string;
  order: number;
  data: Record<string, string | number | null>;
  tableId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function DataGrid({ tableId }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Fetch table with columns
  const { data: table, isLoading: tableLoading } = api.table.getById.useQuery({
    id: tableId,
  });

  // Use infinite query for pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: rowsLoading,
  } = api.row.infinite.useInfiniteQuery(
    {
      tableId,
      limit: 50, // Fetch 50 rows at a time
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Flatten all pages into single array
  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  ) as RowData[];

  // Build TanStack Table columns from Prisma columns
  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    if (!table?.columns) return [];

    // Row number column (first column)
    const rowNumberColumn: ColumnDef<RowData> = {
      id: "_rowNumber",
      accessorFn: () => "", // Dummy accessor to satisfy type
      header: "",
      cell: ({ row }) => (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
          {row.original.order + 1}
        </div>
      ),
      size: 50,
      enableSorting: false,
      enableResizing: false,
    };

    // Data columns from table columns
    const dataColumns: ColumnDef<RowData>[] = table.columns.map((col) => ({
      id: col.id,
      accessorFn: (row) => {
        const cellData = row.data as Record<string, string | number | null>;
        return cellData[col.id];
      },
      header: col.name,
      cell: ({ getValue }) => {
        const value = getValue();
        if (value === null || value === undefined) return "";
        return String(value);
      },
      meta: {
        type: col.type,
      },
      size: 200,
    }));

    return [rowNumberColumn, ...dataColumns];
  }, [table?.columns]);

  // Create table instance
  const tableInstance = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = tableInstance.getRowModel();

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Fetch more data when scrolling near the end
  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem) return;

    // If scrolled within 20 rows of the end and we can fetch more
    if (
      lastItem.index >= tableRows.length - 20 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [
    virtualRows,
    tableRows.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  // Loading state
  if (tableLoading || rowsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // No table found
  if (!table) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Table not found</div>
      </div>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No data yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Add your first row to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className="h-full overflow-auto"
      style={{ contain: "strict" }}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50">
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="border-b border-r border-gray-300 bg-gray-50 px-2 py-2 text-left text-xs font-semibold text-gray-700"
                  style={{ width: header.getSize() }}
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
                colSpan={columns.length}
                className="border-b border-r border-gray-200 px-2 py-4 text-center text-sm text-gray-500"
              >
                Loading more...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
