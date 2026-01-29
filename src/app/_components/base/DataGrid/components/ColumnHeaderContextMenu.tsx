"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "~/trpc/react";
import { TextColumnPanel } from "./ColumnNamingPanel/TextColumnPanel";
import { NumberColumnPanel } from "./ColumnNamingPanel/NumberColumnPanel";
import type { FieldType } from "./ColumnNamingPanel/FieldTypeSelector";
import {
  Pencil,
  Copy,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  Link2,
  FileText,
  Lock,
  ArrowUpAZ,
  ArrowDownZA,
  Filter,
  Layers,
  GitBranch,
  Trash2,
} from "lucide-react";

interface MenuItemType {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
  showDividerAfter?: boolean;
}

interface ColumnHeaderContextMenuProps {
  headerRef: HTMLElement;
  columnId: string;
  tableId: string;
  onClose: () => void;
  initiallyOpenEditPanel?: boolean;
}

export function ColumnHeaderContextMenu({
  headerRef: targetHeader,
  columnId,
  tableId,
  onClose,
  initiallyOpenEditPanel = false,
}: ColumnHeaderContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();
  const [showEditPanel, setShowEditPanel] = useState(initiallyOpenEditPanel);
  const [columnName, setColumnName] = useState("");
  const [columnType, setColumnType] = useState<"TEXT" | "NUMBER">("TEXT");
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  // Fetch column data
  const { data: tableData } = api.table.getById.useQuery({ id: tableId });
  const column = tableData?.columns.find((col) => col.id === columnId);

  // Initialize form when column data loads
  useEffect(() => {
    if (column) {
      setColumnName(column.name);
      setColumnType(column.type);
    }
  }, [column]);

  const updateColumnMutation = api.column.update.useMutation({
    onSuccess: async () => {
      setShowEditPanel(false);
      onClose();
      await utils.table.getById.invalidate({ id: tableId });
    },
    onError: (error) => {
      console.error("Failed to update column:", error);
      alert("Failed to update column. Please try again.");
    },
  });

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

  const handleEditColumn = () => {
    setShowEditPanel(true);
  };

  const handleSaveEdit = () => {
    if (!columnName.trim()) {
      alert("Column name cannot be empty");
      return;
    }
    updateColumnMutation.mutate({
      id: columnId,
      name: columnName,
      type: columnType,
    });
  };

  const handleCancelEdit = () => {
    setShowEditPanel(false);
    // Reset to original values
    if (column) {
      setColumnName(column.name);
      setColumnType(column.type);
    }
  };

  const handleTypeChange = (type: FieldType) => {
    setColumnType(type);
  };

  // Close menu when clicking outside (but not when clicking on edit panel)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !editPanelRef.current?.contains(event.target as Node)
      ) {
        if (!showEditPanel) {
          onClose();
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showEditPanel) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, showEditPanel]);

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

      // Store the position for the edit panel to reuse
      setMenuPosition({ left: adjustedX, top: adjustedY });
    }
  }, [targetHeader]);

  // Calculate position for edit panel when opened directly (via double-click)
  useEffect(() => {
    if (showEditPanel && targetHeader && menuPosition.left === 0 && menuPosition.top === 0) {
      const headerRect = targetHeader.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Approximate panel width (w-sm = 640px)
      const panelWidth = 640;
      
      // Default: position below the header, aligned to left
      let adjustedX = headerRect.left;
      let adjustedY = headerRect.bottom + 5;

      // If panel would go off right edge, align to right of header
      if (adjustedX + panelWidth > viewportWidth) {
        adjustedX = headerRect.right - panelWidth;
      }

      // If still off screen to the left, position inside the viewport
      if (adjustedX < 10) {
        adjustedX = 10;
      }

      setMenuPosition({ left: adjustedX, top: adjustedY });
    }
  }, [showEditPanel, targetHeader, menuPosition]);

  // Define menu items
  const menuItems: MenuItemType[] = [
    {
      id: "edit",
      icon: Pencil,
      label: "Edit field",
      onClick: handleEditColumn,
    },
    {
      id: "duplicate",
      icon: Copy,
      label: "Duplicate field",
      disabled: true,
    },
    {
      id: "insert-left",
      icon: ArrowLeft,
      label: "Insert left",
      disabled: true,
    },
    {
      id: "insert-right",
      icon: ArrowRight,
      label: "Insert right",
      disabled: true,
      showDividerAfter: true,
    },
    {
      id: "change-primary",
      icon: CornerUpLeft,
      label: "Change primary field",
      disabled: true,
    },
    {
      id: "copy-url",
      icon: Link2,
      label: "Copy field URL",
      disabled: true,
    },
    {
      id: "edit-description",
      icon: FileText,
      label: "Edit field description",
      disabled: true,
    },
    {
      id: "edit-permissions",
      icon: Lock,
      label: "Edit field permissions",
      disabled: true,
      showDividerAfter: true,
    },
    {
      id: "sort-asc",
      icon: ArrowUpAZ,
      label: "Sort A → Z",
      disabled: true,
    },
    {
      id: "sort-desc",
      icon: ArrowDownZA,
      label: "Sort Z → A",
      disabled: true,
      showDividerAfter: true,
    },
    {
      id: "filter",
      icon: Filter,
      label: "Filter by this field",
      disabled: true,
    },
    {
      id: "group",
      icon: Layers,
      label: "Group by this field",
      disabled: true,
    },
    {
      id: "dependencies",
      icon: GitBranch,
      label: "Show dependencies",
      disabled: true,
      showDividerAfter: true,
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete field",
      onClick: handleDeleteColumn,
      variant: "danger",
      disabled: deleteColumnMutation.isPending,
    },
  ];

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 rounded-md border border-gray-200 bg-white shadow-lg transition-opacity"
      style={{ opacity: 0 }}
    >
      <div className="py-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isDelete = item.variant === "danger";

          return (
            <div key={item.id}>
              <button
                onClick={item.onClick}
                disabled={item.disabled}
                className={`flex max-h-screen w-full items-center overflow-y-auto px-4 py-2.5 text-xs hover:cursor-pointer ${
                  isDelete
                    ? "text-red-600 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-100"
                } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <Icon className="mr-3.5 h-4 w-4" />
                {item.id === "delete" && deleteColumnMutation.isPending
                  ? "Deleting..."
                  : item.label}
              </button>
              {item.showDividerAfter && (
                <div className="my-1 border-t border-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Position the edit panel at the same location as the menu
  useEffect(() => {
    if (showEditPanel && editPanelRef.current) {
      // Just fade in, position is already set in the style
      editPanelRef.current.style.opacity = "1";
    }
  }, [showEditPanel]);

  // Edit field panel
  const editPanel = showEditPanel && (
    <div
      ref={editPanelRef}
      className="fixed z-50 transition-opacity"
      style={{
        opacity: 0,
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
      }}
    >
      {columnType === "TEXT" ? (
        <TextColumnPanel
          isOpen={true}
          columnName={columnName}
          isCreating={updateColumnMutation.isPending}
          onNameChange={setColumnName}
          onCancel={handleCancelEdit}
          onCreate={handleSaveEdit}
          onTypeChange={handleTypeChange}
          isEditMode={true}
          disablePositioning={true}
          existingColumnNames={tableData?.columns.map((col) => col.name) ?? []}
          currentColumnName={column?.name ?? ""}
        />
      ) : (
        <NumberColumnPanel
          isOpen={true}
          columnName={columnName}
          isCreating={updateColumnMutation.isPending}
          onNameChange={setColumnName}
          onCancel={handleCancelEdit}
          onCreate={handleSaveEdit}
          onTypeChange={handleTypeChange}
          isEditMode={true}
          disablePositioning={true}
          existingColumnNames={tableData?.columns.map((col) => col.name) ?? []}
          currentColumnName={column?.name ?? ""}
        />
      )}
    </div>
  );

  // Render menu in a portal to avoid z-index/positioning conflicts
  return typeof document !== "undefined" ? (
    <>
      {!showEditPanel && createPortal(menu, document.body)}
      {showEditPanel && createPortal(editPanel, document.body)}
    </>
  ) : null;
}
