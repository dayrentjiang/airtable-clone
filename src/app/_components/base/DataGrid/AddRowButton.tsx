"use client";

import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { generateRowId } from "~/lib/id-generator";

interface AddRowButtonProps {
  tableId: string;
}

export function AddRowButton({ tableId }: AddRowButtonProps) {
  const utils = api.useUtils();
  
  const createRow = api.row.create.useMutation({
    // Optimistic update: Add row to UI immediately
    onMutate: async (newRow) => {
      // Cancel any outgoing refetches (but don't cancel other mutations)
      await utils.row.infinite.cancel({ tableId });

      // Snapshot the previous value
      const previousData = utils.row.infinite.getInfiniteData({ tableId });

      // Optimistically update to the new value
      utils.row.infinite.setInfiniteData(
        { tableId, limit: 50 },
        (old) => {
          if (!old) return old;

          // Create optimistic row with the REAL ID (no temp ID needed!)
          const optimisticRow = {
            id: newRow.id!, // Use the client-generated ID
            tableId,
            data: {},
            order: old.pages[0]?.items.length ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to first page
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0
                ? { ...page, items: [...page.items, optimisticRow as any] }
                : page
            ),
          };
        }
      );

      // Return context with previous data for rollback
      return { previousData };
    },

    // On error: rollback to previous state
    onError: (err, newRow, context) => {
      if (context?.previousData) {
        utils.row.infinite.setInfiniteData(
          { tableId, limit: 50 },
          context.previousData
        );
      }
    },

    // On success: No need to replace ID! Just refresh to get server timestamps
    onSettled: () => {
      // Refresh in background (will merge with existing data)
      void utils.row.infinite.invalidate({ tableId });
    },
  });

  const handleAddRow = () => {
    // Generate client ID upfront
    const clientId = generateRowId();
    
    createRow.mutate({
      id: clientId, // Pass client-generated ID to backend
      tableId,
      data: {},
    });
  };

  return (
    <button
      onClick={handleAddRow}
      className="flex w-full items-center gap-2 border-b border-r border-gray-200 px-2 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
      Add row
    </button>
  );
}
