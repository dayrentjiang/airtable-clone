"use client";

import { useState, useRef, useEffect } from "react";
import { TableCellsSplit, Star, MoreHorizontal } from "lucide-react";
import type { ViewItemProps } from "./types";
import { ViewContextMenu } from "./ViewContextMenu";
import { Warning } from "../../ui/Warning";

export function ViewItem({
  viewId,
  viewName,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  existingViewNames = [],
}: ViewItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(viewName);
  const [optimisticName, setOptimisticName] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Check if the name is duplicate (case-insensitive, excluding current name)
  const isDuplicate = existingViewNames.some(
    (existingName) =>
      existingName.toLowerCase() !== viewName.toLowerCase() &&
      existingName.toLowerCase() === renameValue.trim().toLowerCase(),
  );

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

  // Close context menu when clicking outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const displayName = optimisticName ?? viewName;

  const handleRenameStart = () => {
    setRenameValue(displayName);
    setIsRenaming(true);
    setShowWarning(false);
    setContextMenu(null);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue !== viewName && !isDuplicate) {
      // Set optimistic name immediately for instant feedback
      setOptimisticName(renameValue.trim());
      // Close the rename UI
      setIsRenaming(false);
      // Call the mutation with optimistic update
      onRename(renameValue.trim());
    } else if (isDuplicate) {
      setShowWarning(true);
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
      {isRenaming ? (
        <div className="flex flex-col">
          <div className="flex h-8 w-full items-center gap-2 rounded px-2.5 text-xs">
            <TableCellsSplit className="h-4 w-4 shrink-0 text-blue-600" />
            <input
              ref={inputRef}
              type="text"
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setShowWarning(false);
              }}
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
          </div>
          {showWarning && isDuplicate && (
            <div className="px-2.5">
              <Warning message="Please enter a unique view name" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`group flex h-8 w-full cursor-pointer items-center gap-2 rounded px-2.5 text-xs ${
            isSelected
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <button
            onClick={onSelect}
            onContextMenu={handleContextMenu}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2"
          >
            <div className="relative h-4 w-4 shrink-0">
              <TableCellsSplit className="absolute inset-0 h-4 w-4 text-blue-600 transition-opacity group-hover:opacity-0" />
              <Star className="absolute inset-0 h-4 w-4 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <span className="truncate">{displayName}</span>
          </button>
          <button
            onClick={handleMoreClick}
            className="shrink-0 cursor-pointer rounded p-0.5 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {contextMenu && !isRenaming && (
        <div ref={contextMenuRef}>
          <ViewContextMenu
            viewId={viewId}
            viewName={viewName}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onRename={handleRenameStart}
            onDelete={onDelete}
          />
        </div>
      )}
    </>
  );
}
