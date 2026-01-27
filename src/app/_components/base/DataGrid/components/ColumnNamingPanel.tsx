"use client";

import { useRef, useEffect } from "react";
import { X, Type, Hash } from "lucide-react";

interface ColumnNamingPanelProps {
  isOpen: boolean;
  columnType: "TEXT" | "NUMBER" | null;
  columnName: string;
  isCreating: boolean;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

const COLUMN_TYPE_CONFIG = {
  TEXT: {
    icon: Type,
    label: "Text",
  },
  NUMBER: {
    icon: Hash,
    label: "Number",
  },
};

export function ColumnNamingPanel({
  isOpen,
  columnType,
  columnName,
  isCreating,
  onNameChange,
  onCancel,
  onCreate,
}: ColumnNamingPanelProps) {
  const namingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        namingRef.current &&
        !namingRef.current.contains(event.target as Node)
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

  if (!isOpen || !columnType) return null;

  const config = COLUMN_TYPE_CONFIG[columnType];
  const Icon = config.icon;

  return (
    <div
      ref={namingRef}
      className="absolute top-5 right-13 z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Create {config.label} Column
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
          <Icon className="h-4 w-4 text-gray-500" />
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
