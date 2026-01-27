"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { DataGridTable } from "./DataGrid/components/DataGridTable";
import { AddColumnButton } from "./DataGrid/components/AddColumnButton";
import { AddRowButton } from "./DataGrid/components/AddRowButton";
import {
  useTableColumns,
  type RowData,
} from "./DataGrid/hooks/useTableColumns";
import { useWindowedRows } from "./DataGrid/hooks/useWindowedRows";
import { WindowedRowsProvider } from "./DataGrid/hooks/useWindowedRowsContext";
import { useViewConfig } from "./hooks/useViewConfig";
import { CellContextMenu } from "./DataGrid/components/CellContextMenu";
import { ColumnHeaderContextMenu } from "./DataGrid/components/ColumnHeaderContextMenu";
import { useContextMenu } from "./DataGrid/hooks/useContextMenu";
import { ROW_HEIGHT, OVERSCAN_COUNT } from "./DataGrid/constants";

// Re-export SelectionProvider and ContextMenuProvider for use in parent components
export { SelectionProvider, useSelection } from "./DataGrid/hooks/useSelection";
export { ContextMenuProvider } from "./DataGrid/hooks/useContextMenu";

// Import useSelection for internal use
import { useSelection } from "./DataGrid/hooks/useSelection";

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
  
  // Get selection context for keyboard shortcuts
  const { selectedRowIds, editingCell, clearSelection } = useSelection();

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
  // CLEAR ROW VALUES MUTATION WITH OPTIMISTIC UI
  // -------------------------------------------------------------------------
  const utils = api.useUtils();
  
  // Track which rows are being cleared (for optimistic UI)
  // Use a ref to accumulate all cleared rows across multiple deletions
  const [clearingRowIds, setClearingRowIds] = useState<Set<string>>(new Set());
  const allClearedRowIdsRef = useRef<Set<string>>(new Set());
  
  const clearRowValuesMutation = api.row.clearRowValues.useMutation({
    onMutate: async ({ ids }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await utils.row.infiniteWithView.cancel();
      
      // Add to accumulated set
      ids.forEach(id => allClearedRowIdsRef.current.add(id));
      
      // Update state with all accumulated cleared rows
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
      
      // Don't invalidate here - let optimistic state handle the UI
    },
    onError: (_error, { ids }) => {
      // Remove these specific rows from cleared set on error
      ids.forEach(id => allClearedRowIdsRef.current.delete(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
      
      // Invalidate to refetch correct data
      void utils.row.infiniteWithView.invalidate();
      invalidate();
    },
    onSettled: async () => {
      // After mutation completes (success or error), invalidate to sync with server
      await utils.row.infiniteWithView.invalidate();
      invalidate();
      
      // The effect will clear clearingRowIds once it sees the data is actually cleared
    },
  });

  // Store mutation in ref for use in event handlers
  const clearRowValuesMutationRef = useRef(clearRowValuesMutation);
  useEffect(() => {
    clearRowValuesMutationRef.current = clearRowValuesMutation;
  }, [clearRowValuesMutation]);

  // -------------------------------------------------------------------------
  // KEYBOARD HANDLER: Delete/Backspace to clear selected rows
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we have selected rows and not editing a cell
      if (selectedRowIds.size === 0 || editingCell) return;

      // Skip if user is typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle Backspace or Delete key
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        
        // Convert Set to Array for mutation
        const rowIds = Array.from(selectedRowIds);
        
        // Clear the row values using ref
        clearRowValuesMutationRef.current.mutate({ ids: rowIds });
        
        // Clear selection after clearing values
        clearSelection();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedRowIds, editingCell, clearSelection]); // Remove clearRowValuesMutation from deps

  // -------------------------------------------------------------------------
  // FETCH ROWS WITH WINDOWED OFFSET-BASED PAGINATION
  // -------------------------------------------------------------------------
  // This uses offset-based fetching instead of cursor-based infinite scroll.
  // Benefits:
  // - User can scroll to ANY position immediately (e.g., row 90,000)
  // - Scrollbar reflects true dataset size from the start
  // - Multiple windows are cached for smooth bi-directional scrolling
  // - All filtering/sorting still happens in PostgreSQL

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

  // Use windowed rows hook for offset-based fetching
  const {
    rowsByIndex,
    totalCount,
    isLoading: rowsLoading,
    addOptimisticRow,
    invalidate,
  } = useWindowedRows(
    {
      tableId,
      viewId,
      filters: completeFilters.length > 0 ? completeFilters : [],
      sorts: sorts.length > 0 ? sorts : [],
      search: search || undefined,
      enabled: isConfigLoaded,
    },
    tableContainerRef,
  );

  // Track if we've received the first data response
  // This prevents the "No data yet" flash before data loads
  const hasReceivedDataRef = useRef(false);
  useEffect(() => {
    if (totalCount >= 0 && (rowsByIndex.size > 0 || !rowsLoading)) {
      hasReceivedDataRef.current = true;
    }
  }, [totalCount, rowsByIndex.size, rowsLoading]);

  // Reset flag when view changes
  useEffect(() => {
    hasReceivedDataRef.current = false;
  }, [viewId]);

  // Convert rowsByIndex map to array for components that need it
  // Apply optimistic updates for rows being cleared
  const rows = useMemo(() => {
    const arr: RowData[] = [];
    for (const [index, row] of rowsByIndex.entries()) {
      // If this row is being cleared optimistically, show it with empty data
      if (clearingRowIds.has(row.id)) {
        arr[index] = { ...row, data: {} };
      } else {
        arr[index] = row;
      }
    }
    return arr;
  }, [rowsByIndex, clearingRowIds]);

  // Create optimistically updated rowsByIndex map for rendering
  const optimisticRowsByIndex = useMemo(() => {
    // If no rows are being cleared, return original map
    if (clearingRowIds.size === 0) {
      return rowsByIndex;
    }

    // Create a new map with optimistic updates
    const newMap = new Map<number, RowData>();
    for (const [index, row] of rowsByIndex.entries()) {
      if (clearingRowIds.has(row.id)) {
        // Clear the data for this row
        newMap.set(index, { ...row, data: {} });
      } else {
        newMap.set(index, row);
      }
    }
    return newMap;
  }, [rowsByIndex, clearingRowIds]);

  // -------------------------------------------------------------------------
  // AUTO-CLEAR OPTIMISTIC STATE WHEN DATA IS CONFIRMED CLEARED
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (clearingRowIds.size === 0) return;

    // Build a map of visible row IDs for faster lookup
    const visibleRowIds = new Map<string, RowData>();
    for (const [_index, row] of rowsByIndex.entries()) {
      visibleRowIds.set(row.id, row);
    }

    // Check which clearing rows are confirmed cleared
    const confirmedCleared = new Set<string>();
    
    for (const rowId of clearingRowIds) {
      const row = visibleRowIds.get(rowId);
      
      if (row) {
        // Row is visible - check if data is empty
        const hasData = Object.keys(row.data).length > 0;
        if (!hasData) {
          // This row is confirmed cleared
          confirmedCleared.add(rowId);
        }
      }
      // If row is not visible, we can't confirm it yet - keep in clearing state
    }

    // Remove confirmed cleared rows from the accumulated set
    if (confirmedCleared.size > 0) {
      confirmedCleared.forEach(id => allClearedRowIdsRef.current.delete(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
    }
  }, [rowsByIndex, clearingRowIds]);

  // Build column definitions (filtered by hiddenFields from context)
  const highlightSearch = search;
  const highlightFilters = completeFilters;
  const highlightSorts = sorts;

  const columns = useTableColumns(table?.columns, hiddenFields);

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
    for (const row of rowsByIndex.values()) {
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
  }, [search, rowsByIndex, table?.columns, hiddenFields, setSearchMatchCount]);

  // Create table instance
  const tableInstance = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = tableInstance.getRowModel();

  // Virtual scrolling setup - use totalCount to reflect true table size
  // This makes the scrollbar represent all rows, not just loaded ones
  // Use Math.max to handle optimistic updates where rows.length may exceed totalCount
  const virtualRowCount = Math.max(totalCount, tableRows.length);

  const rowVirtualizer = useVirtualizer({
    count: virtualRowCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element.getBoundingClientRect().height
        : undefined, // Measure actual heights for better accuracy (except Firefox due to performance)
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // NOTE: rowsByIndex now comes from useWindowedRows hook
  // No scroll clamping needed - windowed fetching handles any scroll position

  // -------------------------------------------------------------------------
  // RESTORE SCROLL POSITION FROM LOCALSTORAGE
  // -------------------------------------------------------------------------
  // When switching views, restore the scroll position to where user was
  useEffect(() => {
    if (rowsByIndex.size === 0 || hasRestoredScrollRef.current) return;

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
  }, [viewId, rowsByIndex.size]);

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

  // NOTE: Prefetching is now handled by useWindowedRows based on scroll position

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
  // rowsLoading = true only when we have no data at all
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

  // Wrap everything that needs the context in the provider
  return (
    <WindowedRowsProvider value={{ addOptimisticRow, invalidate, totalCount }}>
      {/* Empty state - only show after we've confirmed there's no data */}
      {totalCount === 0 &&
      rowsByIndex.size === 0 &&
      hasReceivedDataRef.current ? (
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
      ) : (
        <div className="relative h-full">
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
                rowsByIndex={optimisticRowsByIndex}
                totalCount={totalCount}
                filters={highlightFilters}
                sorts={highlightSorts}
                searchTerm={highlightSearch}
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

          {/* Sticky bottom bar showing record count */}
          <div className="absolute right-0 bottom-0 left-0 border-t border-gray-200 bg-gray-50 px-4 py-1">
            <div
              className="text-xs text-gray-600"
              style={{ width: tableWidth }}
            >
              {totalCount} {totalCount === 1 ? "record" : "records"}
            </div>
          </div>
        </div>
      )}
    </WindowedRowsProvider>
  );
}
