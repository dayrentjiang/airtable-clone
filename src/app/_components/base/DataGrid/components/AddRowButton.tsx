"use client";

import { Plus } from "lucide-react";
import { api } from "~/trpc/react";
import { generateRowId } from "~/lib/id-generator";
import { useSelection } from "../hooks/useSelection";
import { useWindowedRowsContext } from "../hooks/useWindowedRowsContext";

interface AddRowButtonProps {
  tableId: string;
  viewId?: string; // Kept for compatibility but not used
}

export function AddRowButton({ tableId }: AddRowButtonProps) {
  const { selectCell } = useSelection();
  const { addOptimisticRow, totalCount } = useWindowedRowsContext();

  const createRow = api.row.create.useMutation({
    // Optimistic update: Add row to UI immediately
    onMutate: async (newRow) => {
      // Create optimistic row
      const optimisticRow = {
        id: newRow.id!,
        tableId,
        data: {} as Record<string, string | number | null>,
        order: totalCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to windowed rows state
      const newRowIndex = addOptimisticRow(optimisticRow);

      // Select the first cell of the new row (column index 1, skip row number column)
      selectCell({ rowIndex: newRowIndex, columnIndex: 1 });

      return { newRowIndex };
    },

    // On error: we could invalidate to refetch, but for now just log
    onError: (err) => {
      console.error("Failed to create row:", err);
    },
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
