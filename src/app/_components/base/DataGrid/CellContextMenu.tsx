"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

interface CellContextMenuProps {
  cellRef: HTMLElement;
  rowId: string;
  tableId: string;
  selectedRowIds: string[]; // All selected row IDs for bulk operations
  onClose: () => void;
}

export function CellContextMenu({
  cellRef: targetCell,
  rowId,
  tableId,
  selectedRowIds,
  onClose,
}: CellContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  // Determine if this is a bulk delete (multiple rows selected and current row is in selection)
  const isBulkDelete =
    selectedRowIds.length > 1 && selectedRowIds.includes(rowId);
  const rowIdsToDelete = isBulkDelete ? selectedRowIds : [rowId];

  const deleteRowMutation = api.row.bulkDelete.useMutation({
    onMutate: async () => {
      // Close menu immediately for instant feedback
      onClose();

      // Cancel any outgoing refetches to prevent race conditions
      await utils.row.infiniteWithView.cancel();

      // Optimistically update ALL cached queries for this table using query client
      queryClient.setQueriesData(
        { queryKey: [["row", "infiniteWithView"]], exact: false },
        (old: any) => {
          if (!old?.pages) return old;

          // Only update queries that match this tableId
          const firstPage = old.pages[0];
          if (!firstPage?.items?.[0]) return old;

          const itemTableId = firstPage.items[0].tableId;
          if (itemTableId !== tableId) return old;

          // Filter out all deleted rows
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              items: page.items.filter(
                (row: any) => !rowIdsToDelete.includes(row.id),
              ),
            })),
          };
        },
      );

      return {};
    },
    onError: (error) => {
      console.error("Failed to delete row(s):", error);
      alert(
        `Failed to delete record${isBulkDelete ? "s" : ""}. Please try again.`,
      );
      // Invalidate to refetch correct data on error
      void utils.row.infiniteWithView.invalidate();
    },
    onSettled: async () => {
      // Refetch in background to ensure consistency with server
      await utils.row.infiniteWithView.invalidate();
    },
  });

  const handleDeleteRecord = () => {
    deleteRowMutation.mutate({ ids: rowIdsToDelete });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport - position beside the cell
  useEffect(() => {
    if (menuRef.current && targetCell) {
      const cellRect = targetCell.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default: position to the right of the cell
      let adjustedX = cellRect.right + 5;
      let adjustedY = cellRect.top;

      // If menu would go off right edge, position to the left of the cell
      if (adjustedX + menuRect.width > viewportWidth) {
        adjustedX = cellRect.left - menuRect.width - 5;
      }

      // If still off screen to the left, position inside the viewport
      if (adjustedX < 10) {
        adjustedX = 10;
      }

      // Adjust vertical position if it would go below viewport
      if (adjustedY + menuRect.height > viewportHeight) {
        adjustedY = Math.max(10, viewportHeight - menuRect.height - 10);
      }

      // Ensure it's not above viewport
      if (adjustedY < 10) {
        adjustedY = 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
      menuRef.current.style.opacity = "1";
    }
  }, [targetCell]);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-45 rounded-md border border-gray-200 bg-white shadow-lg transition-opacity"
      style={{ opacity: 0 }}
    >
      <div className="py-1">
        <button
          onClick={handleDeleteRecord}
          disabled={deleteRowMutation.isPending}
          className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {deleteRowMutation.isPending
            ? "Deleting..."
            : isBulkDelete
              ? `Delete all selected records`
              : "Delete Record"}
        </button>
      </div>
    </div>
  );

  // Render menu in a portal to avoid z-index/positioning conflicts
  return typeof document !== "undefined"
    ? createPortal(menu, document.body)
    : null;
}
