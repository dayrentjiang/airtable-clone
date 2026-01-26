"use client";

import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { generateRowId } from "~/lib/id-generator";
import { useSelection } from "./hooks/useSelection";
import { useViewConfig } from "../hooks/useViewConfig";
import { useMemo } from "react";

// Page size constant (must match DataGrid)
const PAGE_SIZE = 150;

// Operators that don't require a value
const NO_VALUE_OPERATORS = ["is_empty", "is_not_empty"];

interface AddRowButtonProps {
  tableId: string;
  viewId?: string;
}

export function AddRowButton({ tableId, viewId }: AddRowButtonProps) {
  const utils = api.useUtils();
  const { selectCell } = useSelection();
  const { filters, sorts, search } = useViewConfig();

  // Filter out incomplete filters (must match DataGrid logic)
  const completeFilters = useMemo(() => {
    return filters.filter((f) => {
      if (NO_VALUE_OPERATORS.includes(f.operator)) {
        return true;
      }
      return f.value !== undefined && f.value !== null && f.value !== "";
    });
  }, [filters]);

  const createRow = api.row.create.useMutation({
    // Optimistic update: Add row to UI immediately
    onMutate: async (newRow) => {
      if (viewId) {
        // Build the exact query params that DataGrid uses
        const queryParams = {
          tableId,
          viewId,
          limit: PAGE_SIZE,
          search: search || undefined,
          filters: completeFilters.length > 0 ? completeFilters : [],
          sorts: sorts.length > 0 ? sorts : [],
        };

        // Cancel any outgoing refetches
        await utils.row.infiniteWithView.cancel(queryParams);

        // Snapshot the previous value
        const previousData = utils.row.infiniteWithView.getInfiniteData(queryParams);

        let newRowIndex = 0;

        // Optimistically update the infinite query data
        utils.row.infiniteWithView.setInfiniteData(
          queryParams,
          (old) => {
            if (!old) return old;

            // Calculate order based on total items across all pages
            const totalItems = old.pages.reduce(
              (acc, page) => acc + page.items.length,
              0,
            );

            newRowIndex = totalItems; // Store for later selection

            const optimisticRow = {
              id: newRow.id!,
              tableId,
              data: {} as Record<string, string | number | null>,
              order: totalItems,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Add to the last page
            const lastPageIndex = old.pages.length - 1;
            return {
              ...old,
              pages: old.pages.map((page, i) =>
                i === lastPageIndex
                  ? { ...page, items: [...page.items, optimisticRow] }
                  : page,
              ),
            };
          },
        );

        // Select the first cell of the new row (column index 1, skip row number column)
        selectCell({ rowIndex: newRowIndex, columnIndex: 1 });

        return { previousData, queryParams };
      }
      return {};
    },

    // On error: rollback to previous state
    onError: (_err, _newRow, context) => {
      if (viewId && context?.previousData && context?.queryParams) {
        utils.row.infiniteWithView.setInfiniteData(
          context.queryParams,
          context.previousData,
        );
      }
    },

    // No onSettled needed - optimistic update uses client-generated ID
  });

  const handleAddRow = () => {
    const clientId = generateRowId();

    createRow.mutate({
      id: clientId,
      tableId,
      data: {},
    });
  };

  return (
    <button
      onClick={handleAddRow}
      className="flex w-full items-center border-b border-gray-200 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
    >
      <div
        className="flex items-center justify-center"
        style={{ width: "66px" }}
      >
        <Plus className="h-4 w-4" />
      </div>
    </button>
  );
}
