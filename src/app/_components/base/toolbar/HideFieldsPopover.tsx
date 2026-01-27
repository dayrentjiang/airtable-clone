"use client";

import { useState, useRef, useEffect } from "react";
import { useViewConfig } from "../hooks/useViewConfig";
import { useToolbarPopovers } from "../hooks/useToolbarPopovers";
import { api } from "~/trpc/react";
import { Toggle } from "../../ui/Toggle";
import { EyeOff, Search, X, FileText, Hash, GripVertical } from "lucide-react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// COLUMN TYPE
// ---------------------------------------------------------------------------

interface Column {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER";
}

// ---------------------------------------------------------------------------
// HIDE FIELDS POPOVER COMPONENT
// ---------------------------------------------------------------------------

interface HideFieldsPopoverProps {
  tableId: string;
}

export function HideFieldsPopover({ tableId }: HideFieldsPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Use shared popover state
  const { isPopoverOpen, setOpenPopover } = useToolbarPopovers();
  const isOpen = isPopoverOpen("hideFields");

  // Get hidden fields state from context
  const { hiddenFields, toggleFieldVisibility, setHiddenFields, saveConfig } =
    useViewConfig();

  // Fetch columns for this table
  const { data: table } = api.table.getById.useQuery(
    { id: tableId },
    { enabled: !!tableId },
  );

  const columns: Column[] = table?.columns ?? [];

  // Filter columns by search query
  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Count visible fields
  const visibleCount = columns.length - hiddenFields.length;

  // Calculate popover position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4,
        left: rect.right - 320, // 320px = w-80
      });
    }
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        // Save config when closing popover
        void saveConfig({ hiddenFields });
        setOpenPopover(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, hiddenFields, saveConfig, setOpenPopover]);

  // Hide all fields
  const handleHideAll = () => {
    const allColumnIds = columns.map((col) => col.id);
    setHiddenFields(allColumnIds);
  };

  // Show all fields
  const handleShowAll = () => {
    setHiddenFields([]);
  };

  // Check if field is visible
  const isVisible = (columnId: string) => !hiddenFields.includes(columnId);

  // Check if any fields are hidden
  const hasHiddenFields = hiddenFields.length > 0;
  const hiddenFieldsLabel =
    hiddenFields.length === 1
      ? "1 hidden field"
      : `${hiddenFields.length} hidden fields`;

  return (
    <div className="relative">
      {/* Hide fields button */}
      <button
        ref={buttonRef}
        onClick={() => setOpenPopover(isOpen ? null : "hideFields")}
        className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-gray-100 md:px-2 ${
          hasHiddenFields ? "bg-blue-50 text-black" : "text-gray-600"
        }`}
      >
        <EyeOff size={16} />
        <span className="hidden md:inline">
          {hasHiddenFields ? hiddenFieldsLabel : "Hide fields"}
        </span>
      </button>

      {/* Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-80 rounded-md border border-gray-200 bg-white shadow-lg"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            {/* Search input */}
            <div className="border-gray-200 px-3 py-2">
              <div className="relative flex items-center border-b border-gray-300 px-0.5 py-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a field"
                  className="w-full border-none bg-transparent py-1 text-xs text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* Column list */}
            <div className="max-h-screen overflow-y-auto px-2 py-2">
              {filteredColumns.map((col) => {
                const visible = isVisible(col.id);
                return (
                  <div
                    key={col.id}
                    className="group flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50"
                  >
                    {/* Toggle switch */}
                    <Toggle
                      enabled={visible}
                      onChange={() => toggleFieldVisibility(col.id)}
                    />

                    {/* Column type icon */}
                    <div className="flex h-5 w-5 items-center justify-center text-gray-500">
                      {col.type === "NUMBER" ? (
                        <Hash size={14} />
                      ) : (
                        <FileText size={14} />
                      )}
                    </div>

                    {/* Column name */}
                    <span className="flex-1 text-xs text-black">
                      {col.name}
                    </span>

                    {/* Drag handle */}
                    <div className="cursor-grab text-gray-300 opacity-0 group-hover:opacity-100">
                      <GripVertical size={16} />
                    </div>
                  </div>
                );
              })}

              {filteredColumns.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No fields found
                </div>
              )}
            </div>
            {/* Footer with bulk actions */}
            <div className="flex items-center gap-2 border-gray-200 px-3 py-2.5">
              <button
                onClick={handleHideAll}
                disabled={hiddenFields.length === columns.length}
                className="flex-1 cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-gray-100"
              >
                Hide all
              </button>
              <button
                onClick={handleShowAll}
                disabled={hiddenFields.length === 0}
                className="flex-1 cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-gray-100"
              >
                Show all
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
