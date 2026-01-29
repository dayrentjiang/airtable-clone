"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { Warning } from "../../ui/Warning";

interface RenameTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  existingTableNames?: string[];
}

export function RenameTableModal({
  isOpen,
  onClose,
  onSave,
  currentName,
  anchorRef,
  existingTableNames = [],
}: RenameTableModalProps) {
  const [name, setName] = useState(currentName);
  const [recordName] = useState("Record");
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if the name is duplicate (case-insensitive, excluding current name)
  const isDuplicate = existingTableNames.some(
    (existingName) =>
      existingName.toLowerCase() !== currentName.toLowerCase() &&
      existingName.toLowerCase() === name.trim().toLowerCase(),
  );

  // Reset state when dropdown opens
  useEffect(() => {
    console.log(
      "RenameTableModal useEffect - isOpen:",
      isOpen,
      "currentName:",
      currentName,
    );
    if (isOpen) {
      setName(currentName);
      setShowWarning(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, currentName]);

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

  const handleSave = () => {
    if (name.trim() && !isDuplicate) {
      onSave(name.trim());
      onClose();
    } else if (isDuplicate) {
      setShowWarning(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const modalWidth = 320; // w-80 = 20rem = 320px
  const top = anchorRect ? anchorRect.bottom + 4 : 0;

  // Calculate left position: prefer left side, fall back to right if no space
  let left = 0;
  if (anchorRect) {
    // Try to position on the left: modal's left edge = anchor's right edge - modal width
    const leftPosition = anchorRect.right - modalWidth;

    if (leftPosition >= 0) {
      // Enough space on the left
      left = leftPosition;
    } else {
      // Not enough space on left, position on the right
      left = anchorRect.left;
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-100 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ top, left }}
    >
      <div className="p-4">
        {/* Table name input */}
        <div className="mb-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowWarning(false);
            }}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border-2 border-blue-500 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
            placeholder="Table name"
          />
          {showWarning && isDuplicate && (
            <Warning message="Please enter a unique table name" />
          )}
        </div>

        {/* Record name section */}
        <div className="mb-3">
          <div className="mb-2 flex items-center gap-1">
            <span className="text-sm text-gray-700">
              What should each record be called?
            </span>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>

          <div className="relative">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <span>{recordName}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Examples */}
        <div className="text-xs text-gray-500">
          <span>Examples: </span>
          <span className="text-gray-600">
            + Add {recordName.toLowerCase()}
          </span>
          <span className="mx-2 text-gray-400">|</span>
          <span className="text-gray-600">
            Send {recordName.toLowerCase()}s
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          Save
        </button>
      </div>
    </div>
  );
}
