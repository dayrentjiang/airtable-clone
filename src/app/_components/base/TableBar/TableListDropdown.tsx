"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Check, EyeOff, Plus } from "lucide-react";
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
  const top = anchorRect ? anchorRect.bottom + 4 : 0;
  const left = anchorRect ? anchorRect.left - 100 : 0;

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
        className="fixed z-100 w-64 rounded-lg border border-gray-200 bg-white shadow-lg"
        style={{ top, left }}
      >
        {/* Search input */}
        <div className="border-b border-gray-200 p-2">
          <div className="flex items-center gap-2 rounded-md border border-gray-300 px-2 py-1.5">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a table"
              className="flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="max-h-64 overflow-y-auto py-1">
          {filteredTables.map((table) => {
            const isActive = table.id === activeTableId;
            return (
              <button
                key={table.id}
                onClick={() => handleTableClick(table.id)}
                className="group flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Check className="h-4 w-4 text-gray-600" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                  <span className={isActive ? "font-medium" : ""}>
                    {table.name}
                  </span>
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
                    <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredTables.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No tables found
            </div>
          )}
        </div>

        {/* Add table */}
        <div className="border-t border-gray-200 py-1">
          <button
            ref={addButtonRef}
            onClick={handleAddTableClick}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            <span>Add table</span>
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
