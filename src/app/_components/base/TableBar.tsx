"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Table } from "lucide-react";

interface TableType {
  id: string;
  name: string;
}

interface TableBarProps {
  tables: TableType[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddTable: (name: string) => void;
}

export function TableBar({
  tables,
  activeTableId,
  onTableSelect,
  onAddTable,
}: TableBarProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isNamingTable, setIsNamingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(event.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    }

    if (isAddMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isAddMenuOpen]);

  // Focus input when naming mode is activated
  useEffect(() => {
    if (isNamingTable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNamingTable]);

  const handleStartFromScratch = () => {
    setIsAddMenuOpen(false);
    setIsNamingTable(true);
    setNewTableName("");
  };

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      onAddTable(newTableName.trim());
      setIsNamingTable(false);
      setNewTableName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCreateTable();
    } else if (e.key === "Escape") {
      setIsNamingTable(false);
      setNewTableName("");
    }
  };

  return (
    <div className="flex h-11 items-center justify-between border-b border-gray-200 bg-white px-3">
      {/* Left: Table tabs */}
      <div className="flex items-center gap-1">
        {/* Table tabs displayed side by side */}
        {tables.map((table) => {
          const isActive = table.id === activeTableId;
          return (
            <button
              key={table.id}
              onClick={() => onTableSelect(table.id)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{table.name}</span>
            </button>
          );
        })}

        {/* Chevron separator */}
        <ChevronDown className="h-4 w-4 -rotate-90 text-gray-300" />

        {/* Add or import with dropdown */}
        {isNamingTable ? (
          <div className="flex items-center gap-2 rounded bg-gray-50 px-2.5 py-1.5">
            <Table className="h-4 w-4 text-gray-600" />
            <input
              ref={inputRef}
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCreateTable}
              placeholder="Name your table"
              className="w-40 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        ) : (
          <div className="relative" ref={addMenuRef}>
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add or import</span>
            </button>

            {/* Dropdown menu */}
            {isAddMenuOpen && (
              <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="py-1">
                  <button
                    onClick={handleStartFromScratch}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Table className="h-4 w-4" />
                    <span>Start from scratch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Tools */}
      <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
        <span>Tools</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
}
