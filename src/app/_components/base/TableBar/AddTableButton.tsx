"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Table,
  Sparkles,
  Globe,
  FileSpreadsheet,
  Calendar,
  Sheet,
  FileText,
  ChevronRight,
  SquareStack,
} from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";
import { RenameTableModal } from "./RenameTableModal";
import type { TableType } from "./types";

interface AddTableButtonProps {
  onAddTable: (name: string) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  newTableId: string | null;
  newTableName: string | null;
  onClearNewTable?: () => void;
  newTableTabRef?: React.RefObject<HTMLDivElement | null>;
  tables: TableType[];
}

export function AddTableButton({
  onAddTable,
  onRenameTable,
  newTableId,
  newTableName,
  onClearNewTable,
  newTableTabRef,
  tables,
}: AddTableButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonClickedRef = useRef(false);

  // Open rename modal when a new table is created
  useEffect(() => {
    if (newTableId) {
      setIsRenameModalOpen(true);
    }
  }, [newTableId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Ignore if this is the button click that just opened the menu
      if (buttonClickedRef.current) {
        buttonClickedRef.current = false;
        return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
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
  }, [isDropdownOpen]);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    buttonClickedRef.current = true;
    setIsDropdownOpen((prev) => !prev);
  };

  const handleStartFromScratch = () => {
    setIsDropdownOpen(false);

    // Generate smart table name based on existing tables
    const baseName = "Table";
    
    // Find the highest number in existing "Table X" names
    let highestNumber = 0;
    tables.forEach((table) => {
      const match = table.name.match(/^Table (\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestNumber) {
          highestNumber = num;
        }
      }
    });
    
    // Use highest number + 1
    const finalName = `${baseName} ${highestNumber + 1}`;

    // Create the table with dynamic name
    onAddTable(finalName);
    // Modal will open automatically via useEffect when newTableId changes
  };

  return (
    <div
      className="relative flex h-full shrink-0 items-center"
      ref={dropdownRef}
    >
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex h-full cursor-pointer items-center px-1.5 text-gray-600 hover:text-gray-800"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Tooltip
        text="Add or import table"
        visible={isHovered && !isDropdownOpen}
        position="bottom"
      />

      {/* Dropdown menu */}
      {isDropdownOpen &&
        (() => {
          const buttonRect = buttonRef.current?.getBoundingClientRect();
          const menuWidth = 224;
          const top = buttonRect ? buttonRect.bottom + 4 : 0;

          // Prefer right side, fall back to left if no space on the right
          let left = buttonRect?.left ?? 0;
          if (buttonRect) {
            const rightPosition = buttonRect.left;
            const fitsOnRight = rightPosition + menuWidth <= window.innerWidth;

            if (fitsOnRight) {
              left = rightPosition;
            } else {
              // Fall back to left side
              left = buttonRect.right - menuWidth;
            }
          }

          return (
            <div
              className="fixed z-50 w-xs rounded-lg border border-gray-300/50 bg-white px-2 py-2 shadow-xl"
              style={{ top: `${top}px`, left: `${left}px` }}
            >
              {/* Add a blank table */}
              <div className="px-3 py-1">
                <span className="text-[10px] text-gray-500">
                  Add a blank table
                </span>
              </div>
              <button
                onClick={handleStartFromScratch}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:cursor-pointer hover:bg-gray-100"
              >
                <span>Start from scratch</span>
              </button>

              <div className="my-2 border-t border-gray-200" />

              {/* Build with Omni */}
              <div className="px-3 py-1">
                <span className="text-xs text-gray-500">Build with Omni</span>
              </div>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span>New table</span>
              </button>
              <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span>New table with web data</span>
                </div>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                  Beta
                </span>
              </button>

              <div className="my-2 border-t border-gray-200" />

              {/* Add from other sources */}
              <div className="px-3 py-1">
                <span className="text-xs text-gray-500">
                  Add from other sources
                </span>
              </div>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <SquareStack className="h-4 w-4 text-blue-500" />
                <span>Airtable base</span>
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>CSV file</span>
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Google Calendar</span>
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <Sheet className="h-4 w-4 text-green-600" />
                <span>Google Sheets</span>
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <FileSpreadsheet className="h-4 w-4 text-green-700" />
                <span>Microsoft Excel</span>
              </button>
              <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-500 text-[8px] font-bold text-white">
                    S
                  </div>
                  <span>Salesforce</span>
                </div>
                <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-xs text-cyan-700">
                  ✦ Business
                </span>
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-900 text-[8px] font-bold text-white">
                  S
                </div>
                <span>Smartsheet</span>
              </button>
              <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-gray-400" />
                  <span>26 more sources...</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          );
        })()}

      {/* Rename table modal - opens after table is created */}
      {newTableId && (
        <RenameTableModal
          isOpen={isRenameModalOpen}
          onClose={() => {
            setIsRenameModalOpen(false);
            // Clear the newly created table tracking when modal is closed
            onClearNewTable?.();
          }}
          onSave={(newName) => {
            // Rename the newly created table
            if (newTableId && onRenameTable) {
              onRenameTable(newTableId, newName);
            }
            setIsRenameModalOpen(false);
            // Clear the newly created table tracking after saving
            onClearNewTable?.();
          }}
          currentName={newTableName ?? "Table 1"}
          anchorRef={newTableTabRef ?? buttonRef}
          existingTableNames={tables.map((table) => table.name)}
        />
      )}
    </div>
  );
}
