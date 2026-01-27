"use client";

import { useRef, useEffect, useState } from "react";
import { X, Hash } from "lucide-react";

interface NumberColumnPanelProps {
  isOpen: boolean;
  columnName: string;
  isCreating: boolean;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

export function NumberColumnPanel({
  isOpen,
  columnName,
  isCreating,
  onNameChange,
  onCancel,
  onCreate,
}: NumberColumnPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<"left" | "right">("left");

  // Calculate position based on available space
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect();
      const panelWidth = 288; // w-72 = 288px

      // Check if there's enough space to align right edge with panel's right edge
      const spaceOnLeft = panelRect.right - panelWidth;

      // If not enough space on left (panel would go off-screen), align left edges
      if (spaceOnLeft < 0) {
        setPosition("right"); // Align left edge with left edge
      } else {
        setPosition("left"); // Align right edge with right edge (default)
      }
    }
  }, [isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onCancel();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onCancel]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onCreate();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`absolute top-5 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg ${
        position === "left" ? "right-0" : "left-0"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Create Number Column
        </h3>
        <button
          onClick={onCancel}
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
          <Hash className="h-4 w-4 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={columnName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter column name"
            className="flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={onCreate}
          disabled={!columnName.trim() || isCreating}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}
