"use client";

import { useState, useRef, useEffect } from "react";
import {
  Menu,
  ChevronDown,
  LayoutList,
  GripHorizontal,
  SquareArrowOutUpRight,
  Database,
  Grid3X3,
  Calendar,
  Image,
  Columns3,
  FileText,
  PaintBucket,
  type LucideIcon,
  TableCellsSplit,
} from "lucide-react";
import { useBaseContext } from "./_state/base-context";
import { SearchInput } from "./ViewToolbar/SearchInput";
import { FilterPopover } from "./ViewToolbar/FilterPopover";
import { SortPopover } from "./ViewToolbar/SortPopover";
import { HideFieldsPopover } from "./ViewToolbar/HideFieldsPopover";
import { ToolbarPopoversProvider } from "./ViewToolbar/hooks/useToolbarPopovers";
import { ViewMenu } from "./ViewToolbar/ViewMenu";
import { Warning } from "../ui/Warning";
import { api } from "~/trpc/react";

// Map view types to their icons
const VIEW_TYPE_ICONS: Record<string, LucideIcon> = {
  GRID: Grid3X3,
  CALENDAR: Calendar,
  GALLERY: Image,
  KANBAN: Columns3,
  FORM: FileText,
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded px-1.5 text-xs text-gray-600 hover:bg-gray-100 md:px-2"
    >
      <span className="shrink-0">{icon}</span>
      <span className="hidden truncate md:inline">{label}</span>
    </button>
  );
}

interface ViewToolbarProps {
  onToggleSideNav: () => void;
  tableId: string;
  viewId: string;
  onViewSelect: (viewId: string) => void;
}

export function ViewToolbar({
  onToggleSideNav,
  tableId,
  viewId,
  onViewSelect,
}: ViewToolbarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [cachedViewName, setCachedViewName] = useState<string | null>(null);
  const viewSelectorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Use context for view data and operations
  const { activeView: view, views, renameView, deleteView } = useBaseContext();

  // Get icon for current view type
  const ViewIcon = view?.type
    ? (VIEW_TYPE_ICONS[view.type] ?? Grid3X3)
    : Grid3X3;

  // Cache the view name to prevent jitter during view switches
  const viewName = view?.name ?? cachedViewName ?? "Grid view";

  // Check if the editing name is duplicate (case-insensitive, excluding current name)
  const isDuplicate = views.some(
    (v) =>
      v.name.toLowerCase() !== viewName.toLowerCase() &&
      v.name.toLowerCase() === editingName.trim().toLowerCase(),
  );

  // Update cached view name when view data loads
  useEffect(() => {
    if (view?.name) {
      setCachedViewName(view.name);
    }
  }, [view?.name]);

  const bulkCreate = api.row.bulkCreate.useMutation({
    onSuccess: async () => {
      alert("Rows created successfully!");
      setIsCreating(false);
    },
    onError: (error: { message: string }) => {
      alert(`Error: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleCreate100k = () => {
    setIsCreating(true);
    bulkCreate.mutate({ tableId, count: 100000 });
  };

  const handleOpenMenu = () => {
    if (viewSelectorRef.current) {
      const rect = viewSelectorRef.current.getBoundingClientRect();
      const menuWidth = 288;

      // Prefer left side positioning
      const leftPosition = rect.right - menuWidth;
      const left = leftPosition >= 0 ? leftPosition : rect.left;

      setMenuPosition({
        top: rect.bottom + 4,
        left,
      });
    }
    setIsMenuOpen((prev) => !prev);
  };

  const handleRename = () => {
    setIsMenuOpen(false);
    setEditingName(viewName);
    setShowWarning(false);
    setIsEditing(true);
  };

  const handleSaveRename = () => {
    if (!editingName.trim() || editingName === viewName) {
      setIsEditing(false);
      setEditingName("");
      setShowWarning(false);
      return;
    }
    if (isDuplicate) {
      setShowWarning(true);
      return;
    }
    // Use context method - optimistic updates are handled by the context
    renameView(viewId, editingName.trim());
    // Close editing state immediately (optimistic)
    setIsEditing(false);
    setEditingName("");
    setShowWarning(false);
  };

  const handleDelete = () => {
    // Don't allow deleting the last view
    if (views.length <= 1) {
      setIsMenuOpen(false);
      return;
    }
    // Close menu immediately (optimistic)
    setIsMenuOpen(false);
    // Select the first remaining view before deleting
    const remainingView = views.find((v) => v.id !== viewId);
    if (remainingView) {
      onViewSelect(remainingView.id);
    }
    // Use context method - optimistic updates are handled by the context
    deleteView(viewId);
  };

  // Focus edit input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const clickedInsideMenu = menuRef.current?.contains(e.target as Node);
      const clickedInsideButton = viewSelectorRef.current?.contains(
        e.target as Node,
      );

      if (!clickedInsideMenu && !clickedInsideButton) {
        setIsMenuOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu on escape
  useEffect(() => {
    if (!isMenuOpen && !isEditing) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
          setEditingName("");
        } else {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen, isEditing]);

  return (
    <ToolbarPopoversProvider>
      <div className="box-border flex h-12 min-h-12 shrink-0 items-center justify-between overflow-hidden border-b border-gray-200 bg-white px-3">
        {/* Left: Hamburger + View dropdown */}
        <div className="flex h-full items-center gap-1">
          <button
            onClick={onToggleSideNav}
            className="flex h-8 cursor-pointer items-center justify-center rounded p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu size={16} className="shrink-0" />
          </button>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => {
                  setEditingName(e.target.value);
                  setShowWarning(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveRename();
                  } else if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditingName("");
                    setShowWarning(false);
                  }
                }}
                onBlur={handleSaveRename}
                className="h-8 w-42 rounded border border-gray-300 bg-white px-2 text-sm font-medium text-gray-800 outline-none focus:border-gray-400"
              />
              {showWarning && isDuplicate && (
                <div className="whitespace-nowrap">
                  <Warning message="Please enter a unique view name" />
                </div>
              )}
            </div>
          ) : (
            <button
              ref={viewSelectorRef}
              onClick={handleOpenMenu}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen(false);
                setEditingName(viewName);
                setIsEditing(true);
              }}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded px-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100 md:px-2.5"
            >
              <TableCellsSplit size={16} className="shrink-0 text-blue-600" />
              <span className="hidden truncate md:inline">{viewName}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
          )}

          <ViewMenu
            isOpen={isMenuOpen}
            position={menuPosition}
            onRename={handleRename}
            onDelete={handleDelete}
            menuRef={menuRef}
            canDelete={views.length > 1}
          />
        </div>

        {/* Right: Toolbar actions */}
        <div className="flex h-full items-center gap-0.5">
          <ToolbarButton
            icon={<Database size={16} />}
            label={isCreating ? "Creating..." : "Create 100k rows"}
            onClick={handleCreate100k}
          />
          <HideFieldsPopover tableId={tableId} />
          <FilterPopover tableId={tableId} />
          <ToolbarButton icon={<LayoutList size={16} />} label="Group" />
          <SortPopover tableId={tableId} />
          <ToolbarButton icon={<PaintBucket size={16} />} label="Color" />

          <button className="flex h-8 cursor-pointer items-center justify-center rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <GripHorizontal size={16} className="shrink-0" />
          </button>

          <ToolbarButton
            icon={<SquareArrowOutUpRight size={16} />}
            label="Share and sync"
          />

          <SearchInput />
        </div>
      </div>
    </ToolbarPopoversProvider>
  );
}
