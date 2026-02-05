"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api } from "~/trpc/react";
import { useViewConfig } from "../../_state/view-config";
import { useTableColumns, type RowData } from "../hooks/useTableColumns";
import { useWindowedRows } from "../hooks/useWindowedRows";
import { ROW_HEIGHT, OVERSCAN_COUNT } from "../constants";
import type {
  DataGridContextValue,
  DataGridContextProviderProps,
} from "./types";

/**
 * DATAGRID CONTEXT
 *
 * Single source of truth for DataGrid state:
 * - Table data and columns
 * - Row data (windowed/paginated)
 * - Virtual scrolling state
 * - Grid operations (add row, clear rows, etc.)
 *
 * WHY THIS EXISTS:
 * - Eliminates prop drilling (DataGridTable had 13+ props)
 * - Centralizes all grid logic in one place
 * - Provides performance optimizations via memoization
 * - Follows the same pattern as BaseContext
 */

// Operators that don't require a value
const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty"];

// ============================================================================
// CONTEXT
// ============================================================================

export const DataGridContext = createContext<DataGridContextValue | null>(null);

DataGridContext.displayName = "DataGridContext";

// ============================================================================
// PROVIDER
// ============================================================================

export function DataGridContextProvider({
  children,
  tableId,
  viewId,
}: DataGridContextProviderProps) {
  // -------------------------------------------------------------------------
  // REFS
  // -------------------------------------------------------------------------
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Track which rows are being cleared (for optimistic UI)
  const [clearingRowIds, setClearingRowIds] = useState<Set<string>>(new Set());
  const allClearedRowIdsRef = useRef<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // GET VIEW CONFIG FROM CONTEXT
  // -------------------------------------------------------------------------
  const { search, filters, sorts, hiddenFields, isConfigLoaded } =
    useViewConfig();

  // -------------------------------------------------------------------------
  // QUERIES
  // -------------------------------------------------------------------------

  // Fetch table with columns
  const { data: table, isLoading: isLoadingTable } = api.table.getById.useQuery(
    { id: tableId },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Filter out incomplete filters (no value when needed)
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
    isLoading: isLoadingRows,
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

  // -------------------------------------------------------------------------
  // MUTATIONS
  // -------------------------------------------------------------------------

  const utils = api.useUtils();

  const clearRowValuesMutation = api.row.clearRowValues.useMutation({
    onMutate: async ({ ids }) => {
      await utils.row.infiniteWithView.cancel();

      // Add to accumulated set
      ids.forEach((id) => allClearedRowIdsRef.current.add(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
    },
    onError: (_error, { ids }) => {
      // Remove these specific rows from cleared set on error
      ids.forEach((id) => allClearedRowIdsRef.current.delete(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));

      void utils.row.infiniteWithView.invalidate();
      invalidate();
    },
    onSettled: async () => {
      await utils.row.infiniteWithView.invalidate();
      invalidate();
    },
  });

  const clearRowValues = useCallback(
    async (ids: string[]) => {
      await clearRowValuesMutation.mutateAsync({ ids });
    },
    [clearRowValuesMutation],
  );

  // -------------------------------------------------------------------------
  // AUTO-CLEAR OPTIMISTIC STATE
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (clearingRowIds.size === 0) return;

    const visibleRowIds = new Map<string, RowData>();
    for (const row of rowsByIndex.values()) {
      visibleRowIds.set(row.id, row);
    }

    const confirmedCleared = new Set<string>();

    for (const rowId of clearingRowIds) {
      const row = visibleRowIds.get(rowId);

      if (row) {
        const hasData = Object.keys(row.data).length > 0;
        if (!hasData) {
          confirmedCleared.add(rowId);
        }
      }
    }

    if (confirmedCleared.size > 0) {
      confirmedCleared.forEach((id) => allClearedRowIdsRef.current.delete(id));
      setClearingRowIds(new Set(allClearedRowIdsRef.current));
    }
  }, [rowsByIndex, clearingRowIds]);

  // -------------------------------------------------------------------------
  // PROCESS ROWS WITH OPTIMISTIC UPDATES
  // -------------------------------------------------------------------------

  // Create optimistically updated rowsByIndex map
  const optimisticRowsByIndex = useMemo(() => {
    if (clearingRowIds.size === 0) {
      return rowsByIndex;
    }

    const newMap = new Map<number, RowData>();
    for (const [index, row] of rowsByIndex.entries()) {
      if (clearingRowIds.has(row.id)) {
        newMap.set(index, { ...row, data: {} });
      } else {
        newMap.set(index, row);
      }
    }
    return newMap;
  }, [rowsByIndex, clearingRowIds]);

  // Convert to array for TanStack Table
  const rows = useMemo(() => {
    const arr: RowData[] = [];
    for (const [index, row] of optimisticRowsByIndex.entries()) {
      arr[index] = row;
    }
    return arr;
  }, [optimisticRowsByIndex]);

  // -------------------------------------------------------------------------
  // BUILD COLUMNS
  // -------------------------------------------------------------------------

  const columns = useTableColumns(table?.columns, hiddenFields);

  // -------------------------------------------------------------------------
  // CREATE TABLE INSTANCE
  // -------------------------------------------------------------------------

  const tableInstance = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // -------------------------------------------------------------------------
  // VIRTUAL SCROLLING
  // -------------------------------------------------------------------------

  const virtualRowCount = Math.max(totalCount, rows.length);

  const rowVirtualizer = useVirtualizer({
    count: virtualRowCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_COUNT,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // -------------------------------------------------------------------------
  // FORCE VIRTUALIZER UPDATE ON FILTER/SORT CHANGES
  // -------------------------------------------------------------------------

  const filtersKey = useMemo(
    () => JSON.stringify(completeFilters),
    [completeFilters],
  );
  const sortsKey = useMemo(() => JSON.stringify(sorts), [sorts]);

  useEffect(() => {
    rowVirtualizer.measure();

    if (tableContainerRef.current) {
      const currentScroll = tableContainerRef.current.scrollTop;
      if (currentScroll === 0) {
        tableContainerRef.current.scrollTop = 1;
        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0;
          }
        }, 0);
      }
    }
  }, [filtersKey, sortsKey, rowVirtualizer, virtualRowCount, rowsByIndex.size]);

  // Force virtualizer update when data arrives
  const prevRowsByIndexSizeRef = useRef(0);
  useEffect(() => {
    const currentSize = rowsByIndex.size;
    const prevSize = prevRowsByIndexSizeRef.current;

    if (prevSize === 0 && currentSize > 0) {
      rowVirtualizer.measure();

      if (tableContainerRef.current?.scrollTop === 0) {
        requestAnimationFrame(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0.1;
            requestAnimationFrame(() => {
              if (tableContainerRef.current) {
                tableContainerRef.current.scrollTop = 0;
              }
            });
          }
        });
      }
    }

    prevRowsByIndexSizeRef.current = currentSize;
  }, [rowsByIndex.size, virtualRowCount, rowVirtualizer]);

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  const tableWidth = 66 + (columns.length - 1) * 180;

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  // -------------------------------------------------------------------------
  // CONTEXT VALUE - MEMOIZED FOR PERFORMANCE
  // -------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      tableId,
      viewId,
      table: table ?? null,
      rowsByIndex: optimisticRowsByIndex,
      totalCount,
      columns,
      isLoadingTable,
      isLoadingRows,
      tableInstance,
      virtualRows,
      rowVirtualizer,
      tableContainerRef,
      tableWidth,
      paddingTop,
      paddingBottom,
      virtualRowCount,
      addOptimisticRow,
      clearRowValues,
      invalidateRows: invalidate,
    }),
    [
      tableId,
      viewId,
      table,
      optimisticRowsByIndex,
      totalCount,
      columns,
      isLoadingTable,
      isLoadingRows,
      tableInstance,
      virtualRows,
      rowVirtualizer,
      tableWidth,
      paddingTop,
      paddingBottom,
      virtualRowCount,
      addOptimisticRow,
      clearRowValues,
      invalidate,
    ],
  );

  return (
    <DataGridContext.Provider value={value}>
      {children}
    </DataGridContext.Provider>
  );
}
