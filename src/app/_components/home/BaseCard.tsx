"use client";

import { useState, useRef, useEffect } from "react";
import { Star, MoreHorizontal } from "lucide-react";
import { api } from "~/trpc/react";
import { BaseOptionsMenu } from "./BaseOptionsMenu";
import { DeleteBaseModal } from "./DeleteBaseModal";
import { Warning } from "../ui/Warning";

interface BaseCardProps {
  name: string;
  baseId: string;
  updatedAt: Date;
  onClick: () => void;
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const updated = new Date(date);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Opened just now";
  if (diffMins < 60) return `Opened ${diffMins} minutes ago`;
  if (diffHours < 24) return `Opened ${diffHours} hours ago`;
  if (diffDays < 7) return `Opened ${diffDays} days ago`;
  return `Opened on ${updated.toLocaleDateString()}`;
}

export function BaseCard({ name, baseId, updatedAt, onClick }: BaseCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  // Fetch all bases to get existing names for validation
  const { data: allBases } = api.base.getAll.useQuery();

  // Check if the name is duplicate (case-insensitive, excluding current name)

  const updateBaseMutation = api.base.update.useMutation({
    // Optimistic update - update UI immediately before server responds
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await utils.base.getAll.cancel();

      // Snapshot the previous value
      const previousBases = utils.base.getAll.getData();

      // Optimistically update the cache
      utils.base.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((base) =>
          base.id === newData.id ? { ...base, name: newData.name } : base,
        );
      });

      // Return context with the previous data
      return { previousBases };
    },
    // If mutation fails, roll back to previous value
    onError: (err, newData, context) => {
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      void utils.base.getAll.invalidate();
      setIsRenaming(false);
    },
  });

  const deleteBaseMutation = api.base.delete.useMutation({
    // Optimistic update - remove from UI immediately
    onMutate: async (deletedData) => {
      // Cancel any outgoing refetches
      await utils.base.getAll.cancel();

      // Snapshot the previous value
      const previousBases = utils.base.getAll.getData();

      // Optimistically update the cache
      utils.base.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return old.filter((base) => base.id !== deletedData.id);
      });

      // Return context with the previous data
      return { previousBases };
    },
    // If mutation fails, roll back to previous value
    onError: (err, deletedData, context) => {
      if (context?.previousBases) {
        utils.base.getAll.setData(undefined, context.previousBases);
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      void utils.base.getAll.invalidate();
    },
  });

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameStart = () => {
    setIsRenaming(true);
    setEditedName(name);
    setShowWarning(false);
  };

  const handleDeleteStart = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    deleteBaseMutation.mutate({ id: baseId });
    setIsDeleteModalOpen(false);
  };

  const handleRenameSubmit = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== name) {
      updateBaseMutation.mutate({ id: baseId, name: trimmedName });
    } else {
      setIsRenaming(false);
      setEditedName(name);
      setShowWarning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setEditedName(name);
      setShowWarning(false);
    }
  };

  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "UN";

  return (
    <>
      <div
        ref={cardRef}
        className="group relative flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs hover:border-gray-300 hover:shadow-sm"
      >
        {/* Main content - clickable area */}
        <div
          onClick={isRenaming ? undefined : onClick}
          className="flex flex-1 items-center gap-4"
        >
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-medium text-white">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            {isRenaming ? (
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => {
                    setEditedName(e.target.value);
                    setShowWarning(false);
                  }}
                  onBlur={handleRenameSubmit}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded border-2 border-blue-500 px-2 py-0.5 text-xs font-bold text-gray-800 outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <p className="truncate text-xs font-bold text-gray-800">{name}</p>
            )}
            {/* Show timestamp by default, show "Open data" on hover */}
            {!isRenaming && (
              <>
                <p className="text-xs text-gray-500 group-hover:hidden">
                  {formatRelativeTime(updatedAt)}
                </p>
                <p className="hidden items-center gap-1.5 text-xs text-gray-500 group-hover:flex">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="shrink-0"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  <span>Open data</span>
                </p>
              </>
            )}
            {isRenaming && (
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                <span>Open data</span>
              </p>
            )}
          </div>
        </div>

        {/* Action buttons - appear on hover (hide during rename) */}
        {!isRenaming && (
          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Star button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add star/favorite functionality
                console.log("Star clicked");
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-yellow-500"
              aria-label="Star base"
            >
              <Star size={18} />
            </button>

            {/* Three-dot menu button */}
            <button
              ref={menuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(true);
              }}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="More options"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Options menu */}
      <BaseOptionsMenu
        baseId={baseId}
        baseName={name}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onRename={handleRenameStart}
        onDelete={handleDeleteStart}
        triggerRef={menuButtonRef}
      />

      {/* Delete confirmation modal */}
      <DeleteBaseModal
        baseName={name}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        triggerRef={cardRef}
      />
    </>
  );
}
