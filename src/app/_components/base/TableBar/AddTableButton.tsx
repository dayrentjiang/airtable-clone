"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Table } from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";
import { RenameTableModal } from "./RenameTableModal";

interface AddTableButtonProps {
  onAddTable: (name: string) => void;
  onRenameTable?: (tableId: string, newName: string) => void;
  newTableId: string | null;
  newTableName: string | null;
  onClearNewTable?: () => void;
}

export function AddTableButton({
  onAddTable,
  onRenameTable,
  newTableId,
  newTableName,
  onClearNewTable,
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
    setIsDropdownOpen(true);
  };

  const handleStartFromScratch = () => {
    setIsDropdownOpen(false);
    // Create the table immediately with a default name
    onAddTable("New Table");
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
          const top = buttonRect ? buttonRect.bottom + 4 : 0;
          const left = buttonRect ? buttonRect.left : 0;

          return (
            <div
              className="fixed z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg"
              style={{ top: `${top}px`, left: `${left}px` }}
            >
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
          anchorRef={buttonRef}
        />
      )}
    </div>
  );
}
