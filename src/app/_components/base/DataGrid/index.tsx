"use client";

import { useRef, useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { DataGridTable } from "./DataGridTable";
import { AddColumnButton } from "./AddColumnButton";
import { useTableColumns, type RowData } from "./hooks/useTableColumns";

interface DataGridProps {
  tableId: string;
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
    { tableId, limit: 50 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  // Flatten all pages into single array
  const rows = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  ) as RowData[];

  // Build column definitions
  const columns = useTableColumns(table?.columns);

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
    estimateSize: () => 35,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Fetch more data when scrolling near the end
  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem) return;

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

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
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
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No data yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Click the button below to add your first row
          </p>
        </div>
        <div className="mt-4">
          <div className="inline-block">
            <div className="w-64">
              <AddRowButton tableId={tableId} />
            </div>
          </div>
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
      <div className="flex">
        <DataGridTable
          table={tableInstance}
          tableId={tableId}
          virtualRows={virtualRows}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
          isFetchingNextPage={isFetchingNextPage}
          columnCount={columns.length}
        />
        <AddColumnButton />
      </div>
    </div>
  );
}

// Re-export AddRowButton for use in empty state
import { AddRowButton } from "./AddRowButton";
