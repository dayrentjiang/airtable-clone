"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Plus,
  Search,
  Settings,
  Grid3X3,
  Calendar,
  Image,
  Columns3,
  GanttChart,
  List,
  ClipboardList,
  FileText,
  LayoutGrid,
  Users,
  User,
  Lock,
  TableCellsSplit,
  Star,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

// View type options for the dropdown
const VIEW_TYPES: Array<{
  type: "GRID" | "CALENDAR" | "GALLERY" | "KANBAN" | "FORM";
  label: string;
  Icon: LucideIcon;
  enabled: boolean;
  team?: boolean;
  color?: string;
}> = [
  { type: "GRID", label: "Grid", Icon: Grid3X3, enabled: true },
  { type: "CALENDAR", label: "Calendar", Icon: Calendar, enabled: false },
  { type: "GALLERY", label: "Gallery", Icon: Image, enabled: false },
  {
    type: "KANBAN",
    label: "Kanban",
    Icon: Columns3,
    enabled: false,
    color: "text-purple-500",
  },
  { type: "FORM", label: "Form", Icon: FileText, enabled: false },
];

// Extended view types (not in schema yet)
const EXTENDED_VIEW_TYPES = [
  {
    type: "TIMELINE",
    label: "Timeline",
    Icon: GanttChart,
    enabled: false,
    team: true,
    color: "text-red-500",
  },
  { type: "LIST", label: "List", Icon: List, enabled: false },
  {
    type: "GANTT",
    label: "Gantt",
    Icon: ClipboardList,
    enabled: false,
    team: true,
  },
  {
    type: "SECTION",
    label: "Section",
    Icon: LayoutGrid,
    enabled: false,
    team: true,
  },
];

const ALL_VIEW_TYPES = [...VIEW_TYPES, ...EXTENDED_VIEW_TYPES];

interface BaseSideNavProps {
  tableId: string | null;
  selectedViewId: string | null;
  onViewSelect: (viewId: string) => void;
}

export function BaseSideNav({
  tableId,
  selectedViewId,
  onViewSelect,
}: BaseSideNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingViewType, setPendingViewType] = useState<
    "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM" | null
  >(null);
  const [viewName, setViewName] = useState("");
  const [editPermission, setEditPermission] = useState<
    "collaborative" | "personal" | "locked"
  >("collaborative");
  const [contextMenu, setContextMenu] = useState<{
    viewId: string;
    viewName: string;
    x: number;
    y: number;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
        setIsRenaming(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch views for the current table
  const { data: views, isLoading } = api.view.getByTableId.useQuery(
    { tableId: tableId! },
    {
      enabled: !!tableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0, // Always refetch
      gcTime: 0, // Don't cache
    },
  );

  // Create view mutation
  const createView = api.view.create.useMutation({
    onSuccess: (newView) => {
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      onViewSelect(newView.id);
      setIsDropdownOpen(false);
    },
  });

  // Delete view mutation
  const deleteView = api.view.delete.useMutation({
    onSuccess: () => {
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      // If deleted view was selected, select the first available view
      if (contextMenu?.viewId === selectedViewId && views && views.length > 1) {
        const remainingView = views.find((v) => v.id !== contextMenu.viewId);
        if (remainingView) {
          onViewSelect(remainingView.id);
        }
      }
      setContextMenu(null);
    },
  });

  // Rename view mutation
  const renameView = api.view.rename.useMutation({
    onSuccess: () => {
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      setIsRenaming(false);
      setContextMenu(null);
    },
  });

  const handleViewTypeClick = (
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => {
    if (!tableId) return;

    // Generate a default name based on existing views
    const existingCount = views?.filter((v) => v.type === type).length ?? 0;
    const defaultName =
      existingCount === 0
        ? type.charAt(0) + type.slice(1).toLowerCase()
        : `${type.charAt(0) + type.slice(1).toLowerCase()} ${existingCount + 1}`;

    setViewName(defaultName);
    setPendingViewType(type);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCreateView = () => {
    if (!tableId || !pendingViewType || !viewName.trim()) return;

    createView.mutate({
      tableId,
      name: viewName.trim(),
      type: pendingViewType,
    });

    // Reset modal state
    setIsModalOpen(false);
    setPendingViewType(null);
    setViewName("");
    setEditPermission("collaborative");
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setPendingViewType(null);
    setViewName("");
    setEditPermission("collaborative");
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    viewId: string,
    viewName: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      viewId,
      viewName,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleRenameClick = () => {
    if (contextMenu) {
      setRenameValue(contextMenu.viewName);
      setIsRenaming(true);
    }
  };

  const handleRenameSubmit = () => {
    if (contextMenu && renameValue.trim()) {
      renameView.mutate({
        id: contextMenu.viewId,
        name: renameValue.trim(),
      });
    }
  };

  const handleDeleteClick = () => {
    if (contextMenu) {
      deleteView.mutate({ id: contextMenu.viewId });
    }
  };

  // Focus input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isModalOpen]);

  return (
    <aside className="flex w-70 flex-col border-r border-gray-200 bg-gray-50/50">
      {/* Top section */}
      <div className="flex-1 p-3">
        {/* Create new */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs text-gray-700 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            <span>Create new...</span>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-0 left-full z-50 ml-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {ALL_VIEW_TYPES.map(
                ({ type, label, Icon, enabled, team, color }) => (
                  <button
                    key={type}
                    onClick={() =>
                      enabled &&
                      handleViewTypeClick(
                        type as
                          | "GRID"
                          | "CALENDAR"
                          | "KANBAN"
                          | "GALLERY"
                          | "FORM",
                      )
                    }
                    disabled={!enabled || createView.isPending}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-[13px] ${
                      enabled
                        ? "cursor-pointer text-gray-700 hover:bg-gray-50"
                        : "cursor-not-allowed text-gray-400"
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${color ?? ""}`} />
                    <span>{label}</span>
                    {team && (
                      <span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                        Team
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* Find a view */}
        <div className="mt-2 flex items-center justify-between">
          <button className="flex items-center gap-2 rounded px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100">
            <Search className="h-3 w-3" />
            <span>Find a view</span>
          </button>
          <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Views list */}
        <div className="mt-3 space-y-0">
          {isLoading ? (
            <div className="px-2.5 py-2 text-xs text-gray-500">Loading...</div>
          ) : views && views.length > 0 ? (
            views.map((view) => {
              const isSelected = view.id === selectedViewId;
              return (
                <div
                  key={view.id}
                  className={`group flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs ${
                    isSelected
                      ? "bg-gray-100 font-medium text-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <button
                    onClick={() => onViewSelect(view.id)}
                    onContextMenu={(e) =>
                      handleContextMenu(e, view.id, view.name)
                    }
                    className="flex flex-1 items-center gap-2 hover:cursor-pointer"
                  >
                    <TableCellsSplit className="h-4 w-4 text-blue-600 group-hover:hidden" />
                    <Star className="hidden h-4 w-4 text-gray-500 group-hover:block" />
                    <span>{view.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, view.id, view.name);
                    }}
                    className="hidden rounded p-1 text-gray-500 group-hover:block hover:bg-gray-200"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-2.5 py-2 text-sm text-gray-500">No views</div>
          )}
        </div>
      </div>

      {/* Create View Modal */}
      {isModalOpen && (
        <>
          {/* Invisible backdrop to detect outside clicks */}
          <div className="fixed inset-0 z-40" onClick={handleCancelModal} />

          {/* Modal positioned next to sidebar */}
          <div className="fixed top-16 left-76 z-50 flex h-full items-start justify-start pt-20 pl-8">
            <div className="w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
              {/* View Name Input */}
              <div className="mb-5">
                <input
                  ref={inputRef}
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && viewName.trim()) {
                      handleCreateView();
                    } else if (e.key === "Escape") {
                      handleCancelModal();
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter view name"
                />
              </div>

              {/* Who can edit section */}
              <div className="mb-5">
                <div className="mb-2 text-sm font-semibold text-gray-900">
                  Who can edit
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="permission"
                      value="collaborative"
                      checked={editPermission === "collaborative"}
                      onChange={(e) =>
                        setEditPermission(
                          e.target.value as
                            | "collaborative"
                            | "personal"
                            | "locked",
                        )
                      }
                      className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Users className="h-3 w-3 text-gray-600" />
                    <span className="text-xs text-gray-700">Collaborative</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="permission"
                      value="personal"
                      checked={editPermission === "personal"}
                      onChange={(e) =>
                        setEditPermission(
                          e.target.value as
                            | "collaborative"
                            | "personal"
                            | "locked",
                        )
                      }
                      className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <User className="h-3 w-3 text-gray-600" />
                    <span className="text-xs text-gray-700">Personal</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="permission"
                      value="locked"
                      checked={editPermission === "locked"}
                      onChange={(e) =>
                        setEditPermission(
                          e.target.value as
                            | "collaborative"
                            | "personal"
                            | "locked",
                        )
                      }
                      className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Lock className="h-3 w-3 text-gray-600" />
                    <span className="text-xs text-gray-700">Locked</span>
                  </label>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  All collaborators can edit the configuration
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleCancelModal}
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateView}
                  disabled={!viewName.trim() || createView.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create new view
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {isRenaming ? (
            <div className="px-2 py-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameSubmit();
                  } else if (e.key === "Escape") {
                    setIsRenaming(false);
                    setContextMenu(null);
                  }
                }}
                onBlur={handleRenameSubmit}
                autoFocus
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <button
                onClick={handleRenameClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled
              >
                <Star className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">
                  Add to &apos;My favorites&apos;
                </span>
              </button>

              <button
                onClick={handleRenameClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4 text-gray-600" />
                <span>Rename view</span>
              </button>

              <button
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled
              >
                <Copy className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">Duplicate view</span>
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={handleDeleteClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete view</span>
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
