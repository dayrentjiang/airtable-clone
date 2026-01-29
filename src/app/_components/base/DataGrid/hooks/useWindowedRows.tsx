"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import type { RowData } from "./useTableColumns";
import type { Filter, Sort } from "~/server/lib/types";
import { ROW_HEIGHT, WINDOW_SIZE } from "../constants";

interface UseWindowedRowsOptions {
  tableId: string;
  viewId: string;
  filters?: Filter[];
  sorts?: Sort[];
  search?: string;
  enabled?: boolean;
}

/**
 * Hook for windowed offset-based data fetching
 *
 * Instead of loading pages sequentially (infinite scroll), this hook:
 * 1. Calculates which rows should be visible based on scroll position
 * 2. Fetches "windows" of data at specific offsets
 * 3. Caches multiple windows for smooth bi-directional scrolling
 * 4. Allows jumping to any position in the dataset
 */
export function useWindowedRows(
  options: UseWindowedRowsOptions,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
) {
  const {
    tableId,
    viewId,
    filters = [],
    sorts = [],
    search,
    enabled = true,
  } = options;

  // Get utils for invalidating queries
  const utils = api.useUtils();

  // Current offset to fetch
  const [currentOffset, setCurrentOffset] = useState(0);

  // Store all loaded rows by their ACTUAL index in the dataset
  const [rowsByIndex, setRowsByIndex] = useState<Map<number, RowData>>(
    new Map(),
  );

  // Track total count
  const [totalCount, setTotalCount] = useState(0);

  // Track if we should reset (params changed)
  const [resetKey, setResetKey] = useState(0);

  // Track query params to detect changes
  const prevParamsRef = useRef<string>("");
  const currentParams = JSON.stringify({
    tableId,
    viewId,
    filters,
    sorts,
    search,
  });

  // Reset state when params change
  useEffect(() => {
    if (
      prevParamsRef.current !== currentParams &&
      prevParamsRef.current !== ""
    ) {
      // Invalidate all cached queries for this table to prevent stale data
      void utils.row.infiniteWithView.invalidate({ tableId, viewId });

      // Scroll to top immediately when filters/sorts change
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = 0;
      }

      setRowsByIndex(new Map());
      setCurrentOffset(0);
      setTotalCount(0);
      setResetKey((k) => k + 1);
      dataOffsetRef.current = null;
      dataParamsRef.current = "";
    }
    prevParamsRef.current = currentParams;
  }, [currentParams, scrollContainerRef, utils, tableId, viewId]);

  // Fetch data for current offset
  const { data, isLoading, isFetching } = api.row.infiniteWithView.useQuery(
    {
      tableId,
      viewId,
      filters,
      sorts,
      search,
      offset: currentOffset,
      limit: WINDOW_SIZE,
    },
    {
      enabled: enabled,
      staleTime: 30000,
      gcTime: 60000,
      refetchOnWindowFocus: false,
    },
  );

  // Track which offset the current data corresponds to
  const dataOffsetRef = useRef<number | null>(null);

  // Track the params that the current data corresponds to
  const dataParamsRef = useRef<string>("");

  // Update rowsByIndex when data arrives
  useEffect(() => {
    if (data?.items && data.items.length > 0) {
      // Validate data matches current params to prevent stale data
      if (dataParamsRef.current === "") {
        dataParamsRef.current = currentParams;
      } else if (dataParamsRef.current !== currentParams) {
        // Params changed but we're receiving old data - ignore it
        return;
      }

      // Get the offset that was used for this query
      const queryOffset = data.offset ?? currentOffset;

      // Avoid duplicate processing
      if (dataOffsetRef.current === queryOffset && rowsByIndex.size > 0) {
        return;
      }
      dataOffsetRef.current = queryOffset;

      setRowsByIndex((prev) => {
        const newMap = new Map(prev);
        (data.items as RowData[]).forEach((row, i) => {
          newMap.set(queryOffset + i, row);
        });
        return newMap;
      });

      if (data.totalCount > 0) {
        setTotalCount(data.totalCount);
      }
    }
  }, [data, currentOffset, resetKey, currentParams, rowsByIndex.size]);

  // Calculate offset from scroll position - with throttling
  const lastScrollUpdateRef = useRef(0);
  const pendingScrollRef = useRef<NodeJS.Timeout | null>(null);

  const updateOffsetFromScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Calculate visible row range
    const startRow = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleRows = Math.ceil(viewportHeight / ROW_HEIGHT);
    const endRow = startRow + visibleRows;

    // Check if we have data for the visible range
    let hasAllVisibleData = true;
    if (totalCount > 0) {
      for (let i = startRow; i <= Math.min(endRow, totalCount - 1); i++) {
        if (!rowsByIndex.has(i)) {
          hasAllVisibleData = false;
          break;
        }
      }
    } else {
      // No data loaded yet, need to fetch
      hasAllVisibleData = false;
    }

    // If we don't have the visible data, calculate which window to fetch
    if (!hasAllVisibleData) {
      // Find the first missing row
      let firstMissing = startRow;
      if (totalCount > 0) {
        for (let i = startRow; i <= endRow; i++) {
          if (!rowsByIndex.has(i)) {
            firstMissing = i;
            break;
          }
        }
      }

      // Calculate the window that contains this row
      const targetOffset = Math.floor(firstMissing / WINDOW_SIZE) * WINDOW_SIZE;

      if (targetOffset !== currentOffset) {
        setCurrentOffset(targetOffset);
      }
    }
  }, [scrollContainerRef, rowsByIndex, currentOffset, totalCount]);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastScrollUpdateRef.current;

    if (pendingScrollRef.current) {
      clearTimeout(pendingScrollRef.current);
    }

    // Throttle to max once per 100ms
    if (timeSinceLastUpdate > 100) {
      lastScrollUpdateRef.current = now;
      updateOffsetFromScroll();
    } else {
      // Schedule update for later
      pendingScrollRef.current = setTimeout(() => {
        lastScrollUpdateRef.current = Date.now();
        updateOffsetFromScroll();
      }, 100 - timeSinceLastUpdate);
    }
  }, [updateOffsetFromScroll]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Initial load
    updateOffsetFromScroll();

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (pendingScrollRef.current) {
        clearTimeout(pendingScrollRef.current);
      }
    };
  }, [scrollContainerRef, handleScroll, updateOffsetFromScroll]);

  // Force update when resetKey changes (filters/sorts change)
  // This ensures data loads even if user doesn't scroll after changing filters
  useEffect(() => {
    if (resetKey > 0) {
      updateOffsetFromScroll();
    }
  }, [resetKey, updateOffsetFromScroll]);

  // Function to add a row optimistically
  const addOptimisticRow = useCallback(
    (row: RowData) => {
      setRowsByIndex((prev) => {
        const newMap = new Map(prev);
        // Add at the end (use totalCount as the new index)
        const newIndex = totalCount;
        newMap.set(newIndex, row);
        return newMap;
      });
      setTotalCount((prev) => prev + 1);

      // Return the index where the row was added
      return totalCount;
    },
    [totalCount],
  );

  // Function to invalidate and refetch data
  const invalidate = useCallback(() => {
    setRowsByIndex(new Map());
    setCurrentOffset(0);
    setResetKey((k) => k + 1);
  }, []);

  return {
    rowsByIndex,
    totalCount,
    isLoading: isLoading && rowsByIndex.size === 0,
    isFetching,
    addOptimisticRow,
    invalidate,
  };
}
