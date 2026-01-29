"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { TableTab } from "./TableBar/TableTab";
import { TableMenu } from "./TableBar/TableMenu";
import { TableListDropdown } from "./TableBar/TableListDropdown";
import { RenameTableModal } from "./TableBar/RenameTableModal";
import { DeleteTableModal } from "./TableBar/DeleteTableModal";
import { AddTableButton } from "./TableBar/AddTableButton";
import type { TableType } from "./TableBar/types";

interface TableBarProps {
  tables: TableType[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onAddTable: (name: string) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  onDeleteTable?: (tableId: string) => void;
  newTableId?: string | null;
  newTableName?: string | null;
  onClearNewTable?: () => void;
}

export function TableBar({
  tables,
  activeTableId,
  onTableSelect,
  onAddTable,
  onRenameTable,
  onDeleteTable,
  newTableId = null,
  newTableName = null,
  onClearNewTable,
}: TableBarProps) {
  // Dropdown states
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isTableListOpen, setIsTableListOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Refs
  const activeTabRef = useRef<HTMLDivElement>(null);
  const newTableTabRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const tableListRef = useRef<HTMLButtonElement>(null);

  // Menu position for active table menu
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close table menu when clicking outside
  useEffect(() => {
    if (!isTableMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideTab = activeTabRef.current?.contains(target);
      const clickedInsideMenu = tableMenuRef.current?.contains(target);

      if (!clickedInsideTab && !clickedInsideMenu) {
        setIsTableMenuOpen(false);
      }
    };

    // Delay adding the listener to avoid closing on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTableMenuOpen]);

  // Handlers
  const handleOpenTableMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (activeTabRef.current) {
      const rect = activeTabRef.current.getBoundingClientRect();
      const menuWidth = 312; // w-78 = 19.5rem = 312px
      const top = rect.bottom + 4;

      // Prefer left side, fall back to right if no space
      const leftPosition = rect.right - menuWidth;
      const left = leftPosition >= 0 ? leftPosition : rect.left;

      setMenuPosition({ top, left });
    }

    setIsTableMenuOpen((prev) => !prev);
  };

  const handleStartRename = () => {
    setIsTableMenuOpen(false);
    setIsRenameModalOpen(true);
  };

  const handleRenameTable = (newName: string) => {
    if (activeTableId && onRenameTable) {
      onRenameTable(activeTableId, newName);
    }
  };

  const handleOpenDeleteModal = () => {
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
    <div className="relative flex h-8 items-end overflow-visible bg-cyan-50 after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px after:bg-gray-300">
      {/* Table tabs */}
      <div className="scrollbar-none flex h-full min-w-0 flex-1 items-end overflow-x-auto overflow-y-visible">
        {tables.map((table, index) => {
          const isActive = table.id === activeTableId;
          const isNewTable = table.id === newTableId;
          const nextIsActive = tables[index + 1]?.id === activeTableId;
          const showDivider =
            !isActive && !nextIsActive && index < tables.length - 1;

          // Determine which ref to use: newTableTabRef for newly created, activeTabRef for active
          const tabRef = isNewTable
            ? newTableTabRef
            : isActive
              ? activeTabRef
              : undefined;

          return (
            <div
              key={table.id}
              ref={tabRef}
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

        {/* Add table button */}
        <AddTableButton
          onAddTable={onAddTable}
          onRenameTable={onRenameTable}
          newTableId={newTableId}
          newTableName={newTableName}
          onClearNewTable={onClearNewTable}
          newTableTabRef={newTableTabRef}
          tables={tables}
        />
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
        existingTableNames={tables.map((table) => table.name)}
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
