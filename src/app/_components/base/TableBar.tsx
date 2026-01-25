"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Table } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

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
  const [isAddButtonHovered, setIsAddButtonHovered] = useState(false);
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
    <div className="relative flex h-8 items-end border-b border-gray-300 bg-cyan-50">
      {/* Left: Table tabs */}
      <div className="scrollbar-none flex h-full min-w-0 flex-1 items-end overflow-x-auto">
        {/* Table tabs displayed side by side */}
        {tables.map((table, index) => {
          const isActive = table.id === activeTableId;
          const nextIsActive = tables[index + 1]?.id === activeTableId;
          const showDivider =
            !isActive && !nextIsActive && index < tables.length - 1;

          return (
            <div key={table.id} className="flex h-full shrink-0 items-end">
              <button
                onClick={() => onTableSelect(table.id)}
                className={`flex items-center gap-1 rounded-t-sm px-3 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "relative z-10 -mb-px h-full border-x border-t border-gray-300 bg-white text-black"
                    : "h-full cursor-pointer text-gray-500 hover:bg-black/10 hover:text-gray-900"
                }`}
              >
                <span className="max-w-24 truncate sm:max-w-none">
                  {table.name}
                </span>
                {isActive && (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                )}
              </button>
              {/* Vertical divider between tabs */}
              {showDivider && (
                <div className="my-auto h-3 w-px bg-gray-400/50" />
              )}
            </div>
          );
        })}

        {/* Chevron separator for more tables */}
        <button className="mr-3 flex h-full shrink-0 items-center px-1.5 text-gray-600 hover:text-gray-800">
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Add table button */}
        {isNamingTable ? (
          <div className="flex h-full shrink-0 items-center gap-2 bg-white/50 px-2.5">
            <Table className="h-4 w-4 text-gray-600" />
            <input
              ref={inputRef}
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleCreateTable}
              placeholder="Name your table"
              className="w-32 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        ) : (
          <div
            className="relative flex h-full shrink-0 items-center"
            ref={addMenuRef}
          >
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              onMouseEnter={() => setIsAddButtonHovered(true)}
              onMouseLeave={() => setIsAddButtonHovered(false)}
              className="flex h-full cursor-pointer items-center px-1.5 text-gray-600 hover:text-gray-800"
            >
              <Plus className="h-4 w-4" />
            </button>
            <Tooltip
              text="Add or import table"
              visible={isAddButtonHovered && !isAddMenuOpen}
              position="bottom"
            />

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
      <div className="flex h-full shrink-0 items-center">
        <button className="flex h-full items-center gap-1 px-2 text-[13px] text-gray-600 hover:text-gray-800">
          <span>Tools</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
