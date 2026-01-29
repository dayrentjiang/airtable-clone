"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";
import {
  Star,
  MoreHorizontal,
  Grid2X2,
  CheckSquare,
  LayoutGrid,
} from "lucide-react";
import { BaseOptionsMenu } from "./BaseOptionsMenu";
import { DeleteBaseModal } from "./DeleteBaseModal";

// Template card icons
function ListIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Base card component
function BaseCard({
  name,
  baseId,
  updatedAt,
  onClick,
}: {
  name: string;
  baseId: string;
  updatedAt: Date;
  onClick: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setEditedName(name);
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
        className="group relative flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm"
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
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                className="w-full rounded border-2 border-blue-500 px-2 py-0.5 text-xs font-bold text-gray-800 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
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

// Group bases by time period
type Base = { id: string; name: string; updatedAt: Date };

function groupBasesByTime(bases: Base[]) {
  const today: Base[] = [];
  const pastWeek: Base[] = [];
  const older: Base[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);

  bases.forEach((base) => {
    const updated = new Date(base.updatedAt);
    if (updated >= todayStart) {
      today.push(base);
    } else if (updated >= weekAgo) {
      pastWeek.push(base);
    } else {
      older.push(base);
    }
  });

  return { today, pastWeek, older };
}

export function HomeContent() {
  const router = useRouter();

  // Ensure user has at least one workspace and base (for new users)
  const ensureDefaultMutation = api.workspace.ensureDefault.useMutation();

  // Fetch all bases for current user
  const { data: bases, isLoading, refetch } = api.base.getAll.useQuery();

  // Check and create default workspace/base on mount
  useEffect(() => {
    if (!isLoading && bases?.length === 0 && !ensureDefaultMutation.isPending) {
      ensureDefaultMutation.mutate(undefined, {
        onSuccess: (result) => {
          if (result.created) {
            // Refresh the bases list
            void refetch();
          }
        },
      });
    }
  }, [isLoading, bases?.length]);

  // Group bases by time
  const grouped = bases
    ? groupBasesByTime(bases)
    : { today: [], pastWeek: [], older: [] };

  const handleBaseClick = (baseId: string) => {
    router.push(`/${baseId}`);
  };

  // Show loading while initial load or auto-creation is in progress
  const isInitializing =
    isLoading || (bases?.length === 0 && ensureDefaultMutation.isPending);

  return (
    <div className="px-12 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900">Home</h1>

      {/* Start building section */}
      <section className="mt-4">
        <h2 className="text-xl font-semibold text-gray-900">Start building</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create apps instantly with AI
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Grid2X2,
              title: "Resource Planner",
              description:
                "Allocate engineers to projects and balance team workloads.",
            },
            {
              icon: CheckSquare,
              title: "Bug Tracker",
              description: "Log, prioritize, and resolve bugs across projects.",
            },
            {
              icon: LayoutGrid,
              title: "Sprint Tracker",
              description:
                "Plan and manage agile sprints with tasks and progress tracking.",
            },
          ].map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.title}
                className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {template.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-600">{template.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Opened anytime section */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            Opened anytime
            <ChevronDownIcon />
          </button>

          <div className="flex items-center gap-1">
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ListIcon />
            </button>
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <GridIcon />
            </button>
          </div>
        </div>

        {/* Loading state - show while initializing or creating defaults */}
        {isInitializing && (
          <div className="mt-6 text-sm text-gray-500">
            {ensureDefaultMutation.isPending
              ? "Setting up your workspace..."
              : "Loading bases..."}
          </div>
        )}

        {/* Only show content when not initializing */}
        {!isInitializing && (
          <>
            {/* Empty state - show when no bases exist */}
            {grouped.today.length === 0 &&
              grouped.pastWeek.length === 0 &&
              grouped.older.length === 0 && (
                <div className="mt-32 flex items-center justify-center">
                  <p className="text-sm text-gray-500">
                    All records are filtered
                  </p>
                </div>
              )}

            {/* Today section */}
            {grouped.today.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Today</h3>
                <div className="mt-3 grid min-h-20 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {grouped.today.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past 7 days section */}
            {grouped.pastWeek.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500">
                  Past 7 days
                </h3>
                <div className="mt-3 grid min-h-20 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {grouped.pastWeek.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older section */}
            {grouped.older.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500">Older</h3>
                <div className="mt-3 grid min-h-20 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {grouped.older.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
