"use client";

import { useRef, useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { DataGridTable } from "./DataGridTable";
import { AddColumnButton } from "./AddColumnButton";
import { AddRowButton } from "./AddRowButton";
import { useTableColumns, type RowData } from "./hooks/useTableColumns";
import { SelectionProvider } from "./hooks/useSelection";
import type { ViewConfig } from "~/server/lib/types";

// Re-export SelectionProvider for use in parent components
export { SelectionProvider, useSelection } from "./hooks/useSelection";

interface DataGridProps {
  tableId: string;
  viewId: string; // Required - tables must have at least 1 view
}

export function DataGrid({ tableId, viewId }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Fetch table with columns - refetch on mount
  const { data: table, isLoading: tableLoading } = api.table.getById.useQuery(
    { id: tableId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch view config - refetch on mount
  const { data: view } = api.view.getById.useQuery(
    { id: viewId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  // Use infiniteWithView with TanStack infinite query - no caching, always refetch
  const {
    data,
    isLoading: rowsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.infiniteWithView.useInfiniteQuery(
    { tableId, viewId, limit: 50 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      gcTime: 0,
      staleTime: 0,
    },
  );

  // Flatten all pages into a single array of rows
  const rows = useMemo(() => {
    return (data?.pages.flatMap((page) => page.items) ?? []) as RowData[];
  }, [data]);

  // Build column definitions (filtered by view's hiddenFields)
  const viewConfig = view?.config as ViewConfig | undefined;
  const hiddenFields = viewConfig?.hiddenFields ?? [];
  const columns = useTableColumns(table?.columns, hiddenFields);

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
      fetchNextPage();
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

  // Calculate table width: row number column (66) + visible data columns (180 each)
  // columns.length - 1 because columns includes the row number column
  const tableWidth = 66 + (columns.length - 1) * 180;

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
              <AddRowButton tableId={tableId} viewId={viewId} />
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
      <div className="flex pb-30">
        <DataGridTable
          table={tableInstance}
          tableId={tableId}
          viewId={viewId}
          virtualRows={virtualRows}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
          isFetchingNextPage={isFetchingNextPage}
          columnCount={columns.length}
          tableWidth={tableWidth}
        />
        <AddColumnButton />
      </div>
    </div>
  );
}
