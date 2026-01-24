"use client";

import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { generateRowId } from "~/lib/id-generator";

interface AddRowButtonProps {
  tableId: string;
  viewId?: string;
}

export function AddRowButton({ tableId, viewId }: AddRowButtonProps) {
  const utils = api.useUtils();

  const createRow = api.row.create.useMutation({
    // Optimistic update: Add row to UI immediately
    onMutate: async (newRow) => {
      if (viewId) {
        // Cancel any outgoing refetches
        await utils.row.infiniteWithView.cancel({ tableId, viewId });

        // Snapshot the previous value
        const previousData = utils.row.infiniteWithView.getInfiniteData({
          tableId,
          viewId,
          limit: 150,
        });

        // Optimistically update the infinite query data
        utils.row.infiniteWithView.setInfiniteData(
          { tableId, viewId, limit: 150 },
          (old) => {
            if (!old) return old;

            // Calculate order based on total items across all pages
            const totalItems = old.pages.reduce(
              (acc, page) => acc + page.items.length,
              0,
            );

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

        return { previousData };
      }
      return {};
    },

    // On error: rollback to previous state and refetch
    onError: (_err, _newRow, context) => {
      if (viewId && context?.previousData) {
        utils.row.infiniteWithView.setInfiniteData(
          { tableId, viewId, limit: 150 },
          context.previousData,
        );
      }
      // Only invalidate on error to get correct server state
      if (viewId) {
        void utils.row.infiniteWithView.invalidate({ tableId, viewId });
      }
    },

    // No onSettled invalidation needed - optimistic update uses client-generated ID
    // which the server accepts, so the data is already correct
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
