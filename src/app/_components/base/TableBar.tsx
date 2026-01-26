"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Table } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { TableTab } from "./TableBar/TableTab";
import { TableMenu } from "./TableBar/TableMenu";
import { TableListDropdown } from "./TableBar/TableListDropdown";
import { RenameTableModal } from "./TableBar/RenameTableModal";
import { DeleteTableModal } from "./TableBar/DeleteTableModal";
import type { TableType } from "./TableBar/types";

interface TableBarProps {
  tables: TableType[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddTable: (name: string) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  onDeleteTable?: (tableId: string) => void;
}

export function TableBar({
  tables,
  activeTableId,
  onTableSelect,
  onAddTable,
  onRenameTable,
  onDeleteTable,
}: TableBarProps) {
  // Dropdown states
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isTableListOpen, setIsTableListOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // New table naming state
  const [isNamingTable, setIsNamingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  // Tooltip state
  const [isAddButtonHovered, setIsAddButtonHovered] = useState(false);

  // Refs
  const addMenuRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableListRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Menu position for active table menu
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close add menu when clicking outside
  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddMenuOpen]);

  // Close table menu when clicking outside
  useEffect(() => {
    if (!isTableMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideTab = activeTabRef.current?.contains(target);
      const clickedInsideMenu = tableMenuRef.current?.contains(target);
      
      if (!clickedInsideTab && !clickedInsideMenu) {
        console.log("Clicked outside table menu, closing");
        setIsTableMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTableMenuOpen]);

  // Focus input when naming mode is activated
  useEffect(() => {
    if (isNamingTable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNamingTable]);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log("RenameModal isOpen state changed:", isRenameModalOpen);
  }, [isRenameModalOpen]);

  useEffect(() => {
    console.log("DeleteModal isOpen state changed:", isDeleteModalOpen);
  }, [isDeleteModalOpen]);

  // Handlers
  const handleOpenTableMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (activeTabRef.current) {
      const rect = activeTabRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    }

    setIsTableMenuOpen((prev) => !prev);
  };

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

  const handleStartRename = () => {
    console.log("Rename table clicked, opening modal");
    setIsTableMenuOpen(false);
    setIsRenameModalOpen(true);
  };

  const handleRenameTable = (newName: string) => {
    if (activeTableId && onRenameTable) {
      onRenameTable(activeTableId, newName);
    }
  };

  const handleOpenDeleteModal = () => {
    console.log("Delete table clicked, opening modal");
    setIsTableMenuOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTable = () => {
    if (activeTableId && onDeleteTable) {
      onDeleteTable(activeTableId);
    }
  };

  const activeTable = tables.find((t) => t.id === activeTableId);

  return (
    <div className="relative flex h-8 items-end overflow-visible bg-blue-50 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px after:bg-gray-300">
      {/* Table tabs */}
      <div className="scrollbar-none flex h-full min-w-0 flex-1 items-end overflow-x-auto overflow-y-visible">
        {tables.map((table, index) => {
          const isActive = table.id === activeTableId;
          const nextIsActive = tables[index + 1]?.id === activeTableId;
          const showDivider =
            !isActive && !nextIsActive && index < tables.length - 1;

          return (
            <div
              key={table.id}
              ref={isActive ? activeTabRef : undefined}
              className="relative flex h-full shrink-0 items-end"
            >
              <TableTab
                table={table}
                isActive={isActive}
                showDivider={showDivider}
                onSelect={() => onTableSelect(table.id)}
                onOpenMenu={handleOpenTableMenu}
              />
            </div>
          );
        })}

        {/* Table list dropdown trigger */}
        <button
          ref={tableListRef}
          onClick={() => setIsTableListOpen(true)}
          className="mr-3 flex h-full shrink-0 cursor-pointer items-center px-1.5 text-gray-600 hover:text-gray-800"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {/* Add table button / input */}
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

            {/* Add table dropdown */}
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

      {/* Tools button */}
      <div className="flex h-full shrink-0 items-center">
        <button className="flex h-full items-center gap-1 px-2 text-[13px] text-gray-600 hover:text-gray-800">
          <span>Tools</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Table menu dropdown */}
      <TableMenu
        isOpen={isTableMenuOpen}
        position={menuPosition}
        onRename={handleStartRename}
        onDelete={handleOpenDeleteModal}
        menuRef={tableMenuRef}
      />

      {/* Rename modal */}
      <RenameTableModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={handleRenameTable}
        currentName={activeTable?.name ?? ""}
        anchorRef={activeTabRef}
      />

      {/* Delete modal */}
      <DeleteTableModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteTable}
        anchorRef={activeTabRef}
      />

      {/* Table list dropdown */}
      <TableListDropdown
        isOpen={isTableListOpen}
        onClose={() => setIsTableListOpen(false)}
        tables={tables}
        activeTableId={activeTableId}
        onTableSelect={onTableSelect}
        onAddTable={onAddTable}
        anchorRef={tableListRef}
      />
    </div>
  );
}
