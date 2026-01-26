"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Check,
  EyeOff,
  Plus,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import type { TableType } from "./types";
import { AddTableModal } from "./AddTableModal";

interface TableListDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableType[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddTable: (name: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function TableListDropdown({
  isOpen,
  onClose,
  tables,
  activeTableId,
  onTableSelect,
  onAddTable,
  anchorRef,
}: TableListDropdownProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Reset search and focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleTableClick = (tableId: string) => {
    onTableSelect(tableId);
    onClose();
  };

  const handleAddTableClick = () => {
    setIsAddModalOpen(true);
  };

  const handleAddTable = (name: string) => {
    onAddTable(name);
    setIsAddModalOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const dropdownWidth = 288; // w-72 = 18rem = 288px
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
        onClick={onClose}
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
              placeholder="Find a table"
              className="flex-1 border-none bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="max-h-screen overflow-y-auto px-4">
          {filteredTables.map((table) => {
            const isActive = table.id === activeTableId;
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table.id)}
                className={`group flex w-full items-center justify-between px-4 py-1.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 ${isActive ? "bg-gray-100" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4 text-gray-600" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span>{table.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement hide table
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        // TODO: Implement hide table
                      }
                    }}
                    className="cursor-pointer rounded p-1 hover:bg-gray-200"
                  >
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement more options
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        // TODO: Implement more options
                      }
                    }}
                    className="cursor-pointer rounded p-1 hover:bg-gray-200"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredTables.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No tables found
            </div>
          )}
        </div>

        {/* Add table */}
        <div className="border-t border-gray-200 px-4 pt-2">
          <button
            ref={addButtonRef}
            onClick={handleAddTableClick}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-4 w-4" />
              <span>Add table</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Add table modal */}
      <AddTableModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTable}
        anchorRef={addButtonRef}
      />
    </>
  );
}
