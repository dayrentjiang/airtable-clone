"use client";

import { Plus } from "lucide-react";
import { ALL_VIEW_TYPES } from "./constants";

interface CreateViewDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onViewTypeSelect: (
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function CreateViewDropdown({
  isOpen,
  onToggle,
  onViewTypeSelect,
  dropdownRef,
}: CreateViewDropdownProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <Plus className="h-4 w-4" />
        <span>Create new...</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 z-50 mt-1 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {ALL_VIEW_TYPES.map(({ type, label, Icon, enabled, team, color }) => (
            <button
              key={type}
              onClick={() => {
                if (enabled) {
                  onViewTypeSelect(
                    type as "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
                  );
                }
              }}
              disabled={!enabled}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
                enabled
                  ? "cursor-pointer text-gray-700 hover:bg-gray-50"
                  : "cursor-not-allowed text-gray-400"
              }`}
            >
              <Icon className={`h-3 w-3 ${color ?? ""}`} />
              <span>{label}</span>
              {team && (
                <span className="ml-auto rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">
                  Team
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
