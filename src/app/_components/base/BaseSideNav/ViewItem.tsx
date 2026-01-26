"use client";

import { useState, useRef, useEffect } from "react";
import { TableCellsSplit, Star, MoreHorizontal } from "lucide-react";
import type { ViewItemProps } from "./types";
import { ViewContextMenu } from "./ViewContextMenu";

export function ViewItem({
  viewId,
  viewName,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}: ViewItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(viewName);
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update optimistic name when the prop changes (server confirmed)
  useEffect(() => {
    if (viewName !== optimisticName) {
      setOptimisticName(null);
    }
  }, [viewName, optimisticName]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const displayName = optimisticName ?? viewName;

  const handleRenameStart = () => {
    setRenameValue(displayName);
    setIsRenaming(true);
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== viewName) {
      // Set optimistic name immediately for instant feedback
      setOptimisticName(renameValue.trim());
      // Close the rename UI
      setIsRenaming(false);
      // Call the mutation with optimistic update
      onRename(renameValue.trim());
    } else {
      setIsRenaming(false);
    }
  };

  const handleRenameCancel = () => {
    setRenameValue(displayName);
    setIsRenaming(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      x: rect.right,
      y: rect.top,
    });
  };

  return (
    <>
      <div
        className={`group flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs ${
          isSelected
            ? "bg-gray-100 font-medium text-gray-900"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {isRenaming ? (
          <>
            <TableCellsSplit className="h-4 w-4 text-blue-600" />
            <input
              ref={inputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRenameSubmit();
                } else if (e.key === "Escape") {
                  handleRenameCancel();
                }
              }}
              onBlur={handleRenameSubmit}
              className="flex-1 rounded border border-gray-300 px-1 py-0.5 text-xs focus:ring-1 focus:ring-gray-300 focus:outline-none"
            />
          </>
        ) : (
          <>
            <button
              onClick={onSelect}
              onContextMenu={handleContextMenu}
              className="flex flex-1 items-center gap-2 hover:cursor-pointer"
            >
              <TableCellsSplit className="h-4 w-4 text-blue-600 group-hover:hidden" />
              <Star className="hidden h-4 w-4 text-gray-500 group-hover:block" />
              <span>{displayName}</span>
            </button>
            <button
              onClick={handleMoreClick}
              className="hidden rounded p-1 text-gray-500 group-hover:block hover:bg-gray-200"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {contextMenu && !isRenaming && (
        <ViewContextMenu
          viewId={viewId}
          viewName={viewName}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={handleRenameStart}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
