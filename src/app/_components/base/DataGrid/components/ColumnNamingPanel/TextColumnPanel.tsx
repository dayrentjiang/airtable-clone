"use client";

import { useRef, useEffect, useState } from "react";
import { Plus, Info } from "lucide-react";
import { FieldTypeSelector, type FieldType } from "./FieldTypeSelector";
import { Warning } from "~/app/_components/ui/Warning";

interface TextColumnPanelProps {
  isOpen: boolean;
  columnName: string;
  isCreating: boolean;
  onNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
  onTypeChange?: (type: FieldType) => void;
  isEditMode?: boolean;
  disablePositioning?: boolean;
  existingColumnNames?: string[];
  currentColumnName?: string;
}

export function TextColumnPanel({
  isOpen,
  columnName,
  isCreating,
  onNameChange,
  onCancel,
  onCreate,
  onTypeChange,
  isEditMode = false,
  disablePositioning = false,
  existingColumnNames = [],
  currentColumnName = "",
}: TextColumnPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState<"left" | "right">("left");
  const [selectedType, setSelectedType] = useState<FieldType>("TEXT");
  const [showWarning, setShowWarning] = useState(false);

  // Check if the name is duplicate (case-insensitive, excluding current name)
  const isDuplicate = existingColumnNames.some(
    (existingName) =>
      existingName.toLowerCase() !== currentColumnName.toLowerCase() &&
      existingName.toLowerCase() === columnName.trim().toLowerCase(),
  );

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
      setShowWarning(false);
    }
  }, [isOpen]);

  const handleCreate = () => {
    if (isDuplicate) {
      setShowWarning(true);
      return;
    }
    onCreate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCreate();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className={`${disablePositioning ? '' : 'absolute top-5 mt-1'} ${disablePositioning ? '' : (position === "left" ? "right-0" : "left-0")} z-50 w-sm rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Field name input - FUNCTIONAL */}
      <div className="mb-1.5">
        <input
          ref={inputRef}
          type="text"
          value={columnName}
          onChange={(e) => {
            onNameChange(e.target.value);
            setShowWarning(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Field name (optional)"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {showWarning && isDuplicate && (
          <Warning message="Please enter a unique column name" />
        )}
      </div>

      {/* Field type selector - FUNCTIONAL */}
      <FieldTypeSelector
        selectedType={selectedType}
        onTypeChange={(type) => {
          setSelectedType(type);
          onTypeChange?.(type);
        }}
        disabled={isEditMode}
      />

      {/* Helper text - NON-FUNCTIONAL */}
      <p className="mb-4 text-xs text-gray-500 opacity-60">
        {selectedType === "TEXT"
          ? "Enter text, or prefill each new cell with a default value."
          : "Enter a number, or prefill each new cell with a default value."}
      </p>

      {/* Default value section - NON-FUNCTIONAL */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-700 opacity-60">
          Default
        </label>
        <input
          type="text"
          placeholder="Enter default value (optional)"
          disabled
          className="w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-400 opacity-60 outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Action buttons */}
      <div className="mb-4 flex justify-between gap-2 pt-4">
        {/* Add description button - NON-FUNCTIONAL */}
        <button
          disabled
          className="flex cursor-not-allowed items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add description
        </button>
        <div>
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!columnName.trim() || isCreating}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditMode ? (isCreating ? "Saving..." : "Save") : "Create field"}
          </button>
        </div>
      </div>

      {/* Automate section - NON-FUNCTIONAL */}
      <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-2 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-600">
            <span className="text-xs font-bold text-white">✦</span>
          </div>
          <span className="text-xs text-gray-700 opacity-60">
            Automate this field with an agent
          </span>
          <Info className="h-3 w-3 text-gray-400 opacity-60" />
        </div>
        <button
          disabled
          className="cursor-not-allowed rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 opacity-60"
        >
          Convert
        </button>
      </div>
    </div>
  );
}
