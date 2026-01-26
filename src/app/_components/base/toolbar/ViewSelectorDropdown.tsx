"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Check,
  EyeOff,
  Plus,
  ChevronRight,
  MoreVertical,
  Grid3X3,
  Calendar,
  Image,
  Columns3,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { api } from "~/trpc/react";
import { ViewMenu } from "./ViewMenu";

// Map view types to their icons
const VIEW_TYPE_ICONS: Record<string, LucideIcon> = {
  GRID: Grid3X3,
  CALENDAR: Calendar,
  GALLERY: Image,
  KANBAN: Columns3,
  FORM: FileText,
};

interface ViewSelectorDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  selectedViewId: string;
  onViewSelect: (viewId: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function ViewSelectorDropdown({
  isOpen,
  onClose,
  tableId,
  selectedViewId,
  onViewSelect,
  anchorRef,
}: ViewSelectorDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuViewId, setMenuViewId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  // Fetch views for the current table
  const { data: views = [] } = api.view.getByTableId.useQuery(
    { tableId },
    {
      enabled: !!tableId && isOpen,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  );

  // Rename view mutation
  const renameViewMutation = api.view.rename.useMutation({
    onSuccess: () => {
      void utils.view.getByTableId.invalidate({ tableId });
      void utils.view.getById.invalidate();
      setEditingViewId(null);
      setEditingName("");
    },
  });

  // Delete view mutation
  const deleteViewMutation = api.view.delete.useMutation({
    onSuccess: () => {
      void utils.view.getByTableId.invalidate({ tableId });
      setMenuViewId(null);
      // If we deleted the selected view, select another one
      if (menuViewId === selectedViewId && views.length > 1) {
        const remainingViews = views.filter((v) => v.id !== menuViewId);
        if (remainingViews.length > 0) {
          onViewSelect(remainingViews[0]!.id);
        }
      }
    },
  });

  const filteredViews = views.filter((view) =>
    view.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Reset search and focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setMenuViewId(null);
      setEditingViewId(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingViewId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingViewId]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const clickedInsideDropdown = dropdownRef.current?.contains(
        e.target as Node,
      );
      const clickedInsideMenu = menuRef.current?.contains(e.target as Node);

      if (!clickedInsideDropdown && !clickedInsideMenu) {
        onClose();
        setMenuViewId(null);
      } else if (clickedInsideDropdown && !clickedInsideMenu && menuViewId) {
        setMenuViewId(null);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, menuViewId]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuViewId) {
          setMenuViewId(null);
        } else if (editingViewId) {
          setEditingViewId(null);
          setEditingName("");
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, menuViewId, editingViewId]);

  const handleViewClick = (viewId: string) => {
    if (editingViewId === viewId) return;
    onViewSelect(viewId);
    onClose();
  };

  const handleOpenMenu = (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const menuWidth = 288;

    // Prefer left side positioning
    const leftPosition = rect.right - menuWidth;
    const left = leftPosition >= 0 ? leftPosition : rect.left;

    setMenuPosition({
      top: rect.bottom + 4,
      left,
    });
    setMenuViewId(viewId);
  };

  const handleRename = () => {
    if (!menuViewId) return;
    const view = views.find((v) => v.id === menuViewId);
    if (view) {
      setEditingViewId(menuViewId);
      setEditingName(view.name);
      setMenuViewId(null);
    }
  };

  const handleSaveRename = () => {
    if (!editingViewId || !editingName.trim()) return;
    renameViewMutation.mutate({
      id: editingViewId,
      name: editingName.trim(),
    });
  };

  const handleDelete = () => {
    if (!menuViewId) return;
    // Don't allow deleting the last view
    if (views.length <= 1) {
      setMenuViewId(null);
      return;
    }
    deleteViewMutation.mutate({ id: menuViewId });
  };

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const dropdownWidth = 288;
  const top = anchorRect ? anchorRect.bottom + 4 : 0;

  // Calculate left position: prefer left side, fall back to right if no space
  let left = 0;
  if (anchorRect) {
    const leftPosition = anchorRect.right - dropdownWidth;
    left = leftPosition >= 0 ? leftPosition : anchorRect.left;
  }

  return (
    <>
      {/* Invisible backdrop to capture clicks outside */}
      <div
        className="fixed inset-0 z-90"
        onClick={() => {
          onClose();
          setMenuViewId(null);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div
        ref={dropdownRef}
        className="fixed z-100 w-lg rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
        style={{ top, left }}
      >
        {/* Search input */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-4 border-b border-gray-300 py-3">
            <Search className="ml-2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a view"
              className="flex-1 border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Views list */}
        <div className="max-h-screen overflow-y-auto px-4">
          {filteredViews.map((view) => {
            const isActive = view.id === selectedViewId;
            const isEditing = view.id === editingViewId;
            const ViewIcon = VIEW_TYPE_ICONS[view.type] ?? Grid3X3;

            return (
              <div
                key={view.id}
                onClick={() => !isEditing && handleViewClick(view.id)}
                className={`group flex w-full cursor-pointer items-center justify-between px-4 py-1.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 ${isActive ? "bg-gray-100" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4 text-gray-600" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <ViewIcon className="h-4 w-4 text-gray-500" />
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveRename();
                        } else if (e.key === "Escape") {
                          setEditingViewId(null);
                          setEditingName("");
                        }
                      }}
                      onBlur={handleSaveRename}
                      onClick={(e) => e.stopPropagation()}
                      className="w-32 border-b border-blue-500 bg-transparent px-1 text-sm font-semibold text-gray-900 outline-none"
                    />
                  ) : (
                    <span>{view.name}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement hide view
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                        }
                      }}
                      className="cursor-pointer rounded p-1 hover:bg-gray-200"
                    >
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleOpenMenu(e, view.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleOpenMenu(
                            e as unknown as React.MouseEvent,
                            view.id,
                          );
                        }
                      }}
                      className="cursor-pointer rounded p-1 hover:bg-gray-200"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredViews.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No views found
            </div>
          )}
        </div>

        {/* Add view */}
        <div className="border-t border-gray-200 px-4 pt-2">
          <button
            onClick={() => {
              // TODO: Implement add view modal
              onClose();
            }}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-4 w-4" />
              <span>Create view</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* View menu */}
      <ViewMenu
        isOpen={!!menuViewId}
        position={menuPosition}
        onRename={handleRename}
        onDelete={handleDelete}
        menuRef={menuRef}
        canDelete={views.length > 1}
      />
    </>
  );
}
