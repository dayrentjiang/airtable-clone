"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

interface ColumnHeaderContextMenuProps {
  headerRef: HTMLElement;
  columnId: string;
  tableId: string;
  onClose: () => void;
}

export function ColumnHeaderContextMenu({
  headerRef: targetHeader,
  columnId,
  tableId,
  onClose,
}: ColumnHeaderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const queryClient = useQueryClient();

  const deleteColumnMutation = api.column.delete.useMutation({
    onMutate: async () => {
      // Close menu immediately for instant feedback
      onClose();

      // Cancel any outgoing refetches to prevent race conditions
      await utils.table.getById.cancel();

      // Optimistically update the table cache
      utils.table.getById.setData({ id: tableId }, (old) => {
        if (!old) return old;

        return {
          ...old,
          columns: old.columns.filter((col) => col.id !== columnId),
        };
      });

      return {};
    },
    onError: (error) => {
      console.error("Failed to delete column:", error);
      alert("Failed to delete column. Please try again.");
      // Invalidate to refetch correct data on error
      void utils.table.getById.invalidate({ id: tableId });
    },
    onSettled: async () => {
      // Refetch in background to ensure consistency with server
      await utils.table.getById.invalidate({ id: tableId });
      // Also invalidate rows since they may reference this column
      await utils.row.infiniteWithView.invalidate();
    },
  });

  const handleDeleteColumn = () => {
    deleteColumnMutation.mutate({ id: columnId });
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

  // Adjust position to keep menu within viewport - position below the header
  useEffect(() => {
    if (menuRef.current && targetHeader) {
      const headerRect = targetHeader.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default: position below the header, aligned to left
      let adjustedX = headerRect.left;
      let adjustedY = headerRect.bottom + 5;

      // If menu would go off right edge, align to right of header
      if (adjustedX + menuRect.width > viewportWidth) {
        adjustedX = headerRect.right - menuRect.width;
      }

      // If still off screen to the left, position inside the viewport
      if (adjustedX < 10) {
        adjustedX = 10;
      }

      // If menu would go below viewport, position above the header
      if (adjustedY + menuRect.height > viewportHeight) {
        adjustedY = headerRect.top - menuRect.height - 5;
      }

      // Ensure it's not above viewport
      if (adjustedY < 10) {
        adjustedY = headerRect.bottom + 5;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
      menuRef.current.style.opacity = "1";
    }
  }, [targetHeader]);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-45 rounded-md border border-gray-200 bg-white shadow-lg transition-opacity"
      style={{ opacity: 0 }}
    >
      <div className="py-1">
        <button
          onClick={handleDeleteColumn}
          disabled={deleteColumnMutation.isPending}
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
          {deleteColumnMutation.isPending ? "Deleting..." : "Delete Column"}
        </button>
      </div>
    </div>
  );

  // Render menu in a portal to avoid z-index/positioning conflicts
  return typeof document !== "undefined"
    ? createPortal(menu, document.body)
    : null;
}
