"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Type, Hash, X } from "lucide-react";
import { api } from "~/trpc/react";
import { useSelection } from "./hooks/useSelection";

interface AddColumnButtonProps {
  tableId: string;
}

export function AddColumnButton({ tableId }: AddColumnButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNamingOpen, setIsNamingOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"TEXT" | "NUMBER" | null>(
    null,
  );
  const [columnName, setColumnName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const namingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const { clearSelection } = useSelection();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (
        namingRef.current &&
        !namingRef.current.contains(event.target as Node)
      ) {
        setIsNamingOpen(false);
        setSelectedType(null);
        setColumnName("");
      }
    }

    if (isMenuOpen || isNamingOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen, isNamingOpen]);

  // Focus input when naming panel opens
  useEffect(() => {
    if (isNamingOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNamingOpen]);

  const createColumnMutation = api.column.create.useMutation({
    onMutate: async (newColumn) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await utils.table.getById.cancel({ id: tableId });

      // Snapshot the previous value
      const previousTable = utils.table.getById.getData({ id: tableId });

      // Optimistically update the table with the new column
      if (previousTable) {
        const lastColumn =
          previousTable.columns[previousTable.columns.length - 1];
        const newOrder = (lastColumn?.order ?? -1) + 1;

        utils.table.getById.setData(
          { id: tableId },
          {
            ...previousTable,
            columns: [
              ...previousTable.columns,
              {
                id: `temp-${Date.now()}`, // Temporary ID
                name: newColumn.name,
                type: newColumn.type,
                tableId: tableId,
                order: newOrder,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
        );
      }

      // Close the naming panel immediately (optimistic)
      setIsNamingOpen(false);
      setSelectedType(null);
      setColumnName("");

      // Return context with previous data
      return { previousTable };
    },
    onError: (err, newColumn, context) => {
      // If mutation fails, roll back to previous value
      if (context?.previousTable) {
        utils.table.getById.setData({ id: tableId }, context.previousTable);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync with server
      void utils.table.getById.invalidate({ id: tableId });
    },
  });

  const handleSelectType = (type: "TEXT" | "NUMBER") => {
    setSelectedType(type);
    setIsMenuOpen(false);
    setIsNamingOpen(true);
    setColumnName("");
    // Clear any cell selection so keyboard input works in the name input
    clearSelection();
  };

  const handleCreateColumn = () => {
    if (columnName.trim() && selectedType) {
      createColumnMutation.mutate({
        tableId,
        name: columnName.trim(),
        type: selectedType,
      });
    }
  };

  const handleCancel = () => {
    setIsNamingOpen(false);
    setSelectedType(null);
    setColumnName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCreateColumn();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="shrink-0">
      {/* Header cell with + button - matches th padding */}
      <div
        ref={menuRef}
        className="sticky top-0 z-10 flex w-23 cursor-pointer items-center justify-center border-r border-b border-gray-300 bg-gray-50 px-2 py-2 hover:bg-gray-100"
        onClick={() => {
          setIsMenuOpen(!isMenuOpen);
          // Clear selection when opening the menu
          clearSelection();
        }}
      >
        <div className="relative">
          <div className="flex items-center justify-center text-gray-400">
            <Plus className="h-4 w-4" />
          </div>

          {/* Type selection dropdown */}
          {isMenuOpen && (
            <div
              className="absolute top-full left-0 z-50 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={() => handleSelectType("TEXT")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Type className="h-4 w-4" />
                  <span>Text</span>
                </button>
                <button
                  onClick={() => handleSelectType("NUMBER")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Hash className="h-4 w-4" />
                  <span>Number</span>
                </button>
              </div>
            </div>
          )}

          {/* Naming panel */}
          {isNamingOpen && (
            <div
              ref={namingRef}
              className="absolute top-full left-0 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Create {selectedType === "TEXT" ? "Text" : "Number"} Column
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Column Name
                </label>
                <div className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2">
                  {selectedType === "TEXT" ? (
                    <Type className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Hash className="h-4 w-4 text-gray-500" />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={columnName}
                    onChange={(e) => setColumnName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter column name"
                    className="flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateColumn}
                  disabled={
                    !columnName.trim() || createColumnMutation.isPending
                  }
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createColumnMutation.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
