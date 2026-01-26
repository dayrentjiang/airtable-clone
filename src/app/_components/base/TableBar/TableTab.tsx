"use client";

import { ChevronDown } from "lucide-react";
import type { TableType } from "./types";

interface TableTabProps {
  table: TableType;
  isActive: boolean;
  showDivider: boolean;
  onSelect: () => void;
  onOpenMenu: (e: React.MouseEvent) => void;
}

export function TableTab({
  table,
  isActive,
  showDivider,
  onSelect,
  onOpenMenu,
}: TableTabProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (isActive) {
      onOpenMenu(e);
    } else {
      onSelect();
    }
  };

  return (
    <div className="relative flex h-full shrink-0 items-end">
      <button
        onClick={handleClick}
        className={`flex items-center gap-1 px-3 text-[13px] font-medium transition-colors ${
          isActive
            ? "relative z-10 mb-[-1px] h-[calc(100%+1px)] cursor-pointer rounded-t-sm border-x border-t border-gray-300 bg-white text-black"
            : "h-full cursor-pointer text-gray-500 hover:bg-black/10 hover:text-gray-900"
        }`}
      >
        <span className="max-w-24 truncate sm:max-w-none">{table.name}</span>
        {isActive && <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
      </button>

      {/* Vertical divider between tabs */}
      {showDivider && <div className="my-auto h-3 w-px bg-gray-400/50" />}
    </div>
  );
}
