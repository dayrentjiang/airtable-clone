"use client";

import { useRef, useEffect, useMemo } from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { DataGridTable } from "./DataGridTable";
import { AddColumnButton } from "./AddColumnButton";
import { AddRowButton } from "./AddRowButton";
import { useTableColumns, type RowData } from "./hooks/useTableColumns";
import { useViewConfig } from "../hooks/useViewConfig";
import { CellContextMenu } from "./CellContextMenu";
import { ColumnHeaderContextMenu } from "./ColumnHeaderContextMenu";
import { useContextMenu } from "./hooks/useContextMenu";

// Re-export SelectionProvider and ContextMenuProvider for use in parent components
export { SelectionProvider, useSelection } from "./hooks/useSelection";
export { ContextMenuProvider } from "./hooks/useContextMenu";

// Operators that don't require a value
const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty"];

interface DataGridProps {
  tableId: string;
  viewId: string; // Required - tables must have at least 1 view
}

export function DataGrid({ tableId, viewId }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const {
    contextMenuState,
    columnContextMenuState,
    hideContextMenu,
    hideColumnContextMenu,
  } = useContextMenu();

  // Track if we've restored scroll position for this view
  const hasRestoredScrollRef = useRef(false);

  // -------------------------------------------------------------------------
  // GET LIVE CONFIG FROM CONTEXT
  // -------------------------------------------------------------------------
  // This is the "live" state that user is editing (search, filters, sorts)
  // Changes here immediately affect the query below
  const {
    search,
    filters,
    sorts,
    hiddenFields,
    setSearchMatchCount,
    isConfigLoaded,
  } = useViewConfig();

  // Fetch table with columns - refetch on mount
  const { data: table, isLoading: tableLoading } = api.table.getById.useQuery(
    { id: tableId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // -------------------------------------------------------------------------
  // FETCH ROWS WITH LIVE CONFIG (filters, sorts, search)
  // -------------------------------------------------------------------------
  // This is where the magic happens!
  // - `search` is passed to the query → server builds SQL with ILIKE
  // - `filters` is passed → server builds WHERE clauses
  // - `sorts` is passed → server builds ORDER BY clauses
  // - All filtering/sorting happens in PostgreSQL, not in JavaScript

  // Filter out incomplete filters (no value when needed)
  // This prevents query from running when user clicks "Add condition"
  const completeFilters = useMemo(() => {
    return filters.filter((f) => {
      // Operators like "is empty" don't need a value
      if (NO_VALUE_OPERATORS.includes(f.operator)) {
        return true;
      }
      // Other operators need a value to be complete
      return f.value !== undefined && f.value !== null && f.value !== "";
    });
  }, [filters]);

  const {
    data,
    isLoading: rowsLoading,
    isPlaceholderData,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = api.row.infiniteWithView.useInfiniteQuery(
    {
      tableId,
      viewId,
      limit: 150,
      // Pass live config to query - these override saved view config
      search: search || undefined, // Global text search
      filters: completeFilters.length > 0 ? completeFilters : undefined, // Only complete filters
      sorts: sorts.length > 0 ? sorts : undefined, // Column sorts
    },
    {
      // CRITICAL: Don't run query until config has loaded from DB
      // This prevents fetching with empty filters before saved filters load
      enabled: isConfigLoaded,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnMount: false, // Don't refetch on mount - use cached data
      refetchOnWindowFocus: false,
      staleTime: 30000, // Cache for 30 seconds - smooth UX
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      // Keep previous data while fetching new data (smooth transitions)
      placeholderData: (previousData) => previousData,
    },
  );

  // Flatten all pages into a single array of rows
  // TODO: Implement sliding window to cap memory (keep only ~3-5 pages around viewport)
  const rows = useMemo(() => {
    return (data?.pages.flatMap((page) => page.items) ?? []) as RowData[];
  }, [data]);

  // Build column definitions (filtered by hiddenFields from context)
  // IMPORTANT: When showing placeholder data (old results), use empty filters/search
  // to avoid highlighting NEW criteria on OLD data
  // Only apply highlighting once new data arrives
  const highlightSearch = isPlaceholderData ? "" : search;
  const highlightFilters = isPlaceholderData ? [] : completeFilters;
  const highlightSorts = isPlaceholderData ? [] : sorts;

  const columns = useTableColumns(
    table?.columns,
    hiddenFields,
    highlightSearch,
    highlightFilters,
    highlightSorts,
  );

  // -------------------------------------------------------------------------
  // CALCULATE SEARCH MATCH COUNT
  // -------------------------------------------------------------------------
  // Count how many cells match the search term in loaded rows
  // This updates the "X of Y" counter in the search input
  useEffect(() => {
    if (!search || !table?.columns) {
      setSearchMatchCount(0);
      return;
    }

    const searchLower = search.toLowerCase();
    let matchCount = 0;

    // Get visible column IDs (exclude hidden)
    const visibleColumnIds = table.columns
      .filter((col) => !hiddenFields.includes(col.id))
      .map((col) => col.id);

    // Count matches across all loaded rows and visible columns
    for (const row of rows) {
      for (const colId of visibleColumnIds) {
        const cellValue = row.data[colId];
        if (cellValue != null) {
          const stringValue = String(cellValue).toLowerCase();
          if (stringValue.includes(searchLower)) {
            matchCount++;
          }
        }
      }
    }

    setSearchMatchCount(matchCount);
  }, [search, rows, table?.columns, hiddenFields, setSearchMatchCount]);

  // Create table instance
  const tableInstance = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = tableInstance.getRowModel();

  // Virtual scrolling setup with optimized overscan for production
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 50, // 50 rows overscan - optimal for smooth fast scrolling
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element.getBoundingClientRect().height
        : undefined, // Measure actual heights for better accuracy (except Firefox due to performance)
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // -------------------------------------------------------------------------
  // RESTORE SCROLL POSITION FROM LOCALSTORAGE
  // -------------------------------------------------------------------------
  // When switching views, restore the scroll position to where user was
  useEffect(() => {
    if (!rows.length || hasRestoredScrollRef.current) return;

    const storageKey = `airtable-scroll-${viewId}`;
    const savedScrollTop = localStorage.getItem(storageKey);

    if (savedScrollTop && tableContainerRef.current) {
      const scrollTop = parseInt(savedScrollTop, 10);

      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = scrollTop;
          hasRestoredScrollRef.current = true;
        }
      }, 0);
    } else {
      hasRestoredScrollRef.current = true;
    }
  }, [viewId, rows.length]);

  // -------------------------------------------------------------------------
  // SAVE SCROLL POSITION TO LOCALSTORAGE
  // -------------------------------------------------------------------------
  // Save scroll position as user scrolls (debounced via scroll events)
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Debounce: only save after user stops scrolling for 150ms
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const storageKey = `airtable-scroll-${viewId}`;
        localStorage.setItem(storageKey, container.scrollTop.toString());
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [viewId]);

  // Reset restoration flag when view changes
  useEffect(() => {
    hasRestoredScrollRef.current = false;
  }, [viewId]);

  // -------------------------------------------------------------------------
  // PREFETCH NEXT PAGE
  // -------------------------------------------------------------------------
  // Prefetch when user is 70 rows from end (with 150 rows/page)
  useEffect(() => {
    const lastItem = virtualRows[virtualRows.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= tableRows.length - 70 &&
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

  // Calculate table width: row number column (66) + visible data columns (180 each)
  const tableWidth = 66 + (columns.length - 1) * 180;

  // -------------------------------------------------------------------------
  // LOADING STATES
  // -------------------------------------------------------------------------

  // CRITICAL: Wait for view config to load before rendering
  // This prevents showing unfiltered data before filters are applied
  if (!isConfigLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-500">Loading view configuration...</div>
      </div>
    );
  }

  // Show loading ONLY on initial load (no data yet)
  // When filtering/searching, keep showing current data with placeholderData
  // rowsLoading = true only on first load (no cached data)
  // isFetching = true when refetching (filters/search changed)
  if (tableLoading || (rowsLoading && !data)) {
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
          columnCount={columns.length}
          tableWidth={tableWidth}
        />
        <AddColumnButton tableId={tableId} />
      </div>

      {/* Global context menu for rows - rendered once at DataGrid level */}
      {contextMenuState?.cellRef && (
        <CellContextMenu
          cellRef={contextMenuState.cellRef}
          rowId={contextMenuState.rowId}
          tableId={contextMenuState.tableId}
          selectedRowIds={contextMenuState.selectedRowIds}
          onClose={hideContextMenu}
        />
      )}

      {/* Global context menu for columns - rendered once at DataGrid level */}
      {columnContextMenuState?.headerRef && (
        <ColumnHeaderContextMenu
          headerRef={columnContextMenuState.headerRef}
          columnId={columnContextMenuState.columnId}
          tableId={columnContextMenuState.tableId}
          onClose={hideColumnContextMenu}
        />
      )}
    </div>
  );
}
