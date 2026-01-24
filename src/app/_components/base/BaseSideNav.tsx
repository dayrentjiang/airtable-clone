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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch views for the current table - refetch on mount
  const { data: views, isLoading } = api.view.getByTableId.useQuery(
    { tableId: tableId! },
    {
      enabled: !!tableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      gcTime: 0,
      staleTime: 0,
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

  // Focus input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isModalOpen]);

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-gray-50/50">
      {/* Top section */}
      <div className="flex-1 p-3">
        {/* Create new */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            <span>Create new...</span>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-0 left-full z-50 ml-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
                    className={`flex w-full items-center gap-3 px-3 py-2 text-sm ${
                      enabled
                        ? "cursor-pointer text-gray-700 hover:bg-gray-50"
                        : "cursor-not-allowed text-gray-400"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${color ?? ""}`} />
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
          <button className="flex items-center gap-2 rounded px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-100">
            <Search className="h-4 w-4" />
            <span>Find a view</span>
          </button>
          <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Views list */}
        <div className="mt-3 space-y-1">
          {isLoading ? (
            <div className="px-2.5 py-2 text-sm text-gray-500">Loading...</div>
          ) : views && views.length > 0 ? (
            views.map((view) => {
              const isSelected = view.id === selectedViewId;
              return (
                <button
                  key={view.id}
                  onClick={() => onViewSelect(view.id)}
                  className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-sm ${
                    isSelected
                      ? "bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span>{view.name}</span>
                </button>
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={handleCancelModal}
          />

          {/* Modal positioned next to sidebar */}
          <div className="fixed top-0 left-60 z-50 flex h-full items-start justify-start pt-20 pl-8">
            <div className="w-100 rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter view name"
                />
              </div>

              {/* Who can edit section */}
              <div className="mb-5">
                <div className="mb-3 text-sm font-semibold text-gray-900">
                  Who can edit
                </div>
                <div className="space-y-0">
                  <label className="flex cursor-pointer items-start gap-3 py-2">
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Users className="mt-0.5 h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">Collaborative</div>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 py-2">
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <User className="mt-0.5 h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">Personal</div>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 py-2">
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
                      className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Lock className="mt-0.5 h-4 w-4 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">Locked</div>
                    </div>
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
    </aside>
  );
}
