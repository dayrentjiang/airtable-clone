"use client";

import { useState } from "react";
import {
  Menu,
  LayoutGrid,
  ChevronDown,
  LayoutList,
  Baseline,
  GripHorizontal,
  SquareArrowOutUpRight,
  Database,
} from "lucide-react";
import { api } from "~/trpc/react";
import { SearchInput } from "./toolbar/SearchInput";
import { FilterPopover } from "./toolbar/FilterPopover";
import { SortPopover } from "./toolbar/SortPopover";
import { HideFieldsPopover } from "./toolbar/HideFieldsPopover";
import { ToolbarPopoversProvider } from "./hooks/useToolbarPopovers";

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-100 md:px-2"
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

interface ViewToolbarProps {
  onToggleSideNav: () => void;
  tableId: string;
}

export function ViewToolbar({ onToggleSideNav, tableId }: ViewToolbarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const utils = api.useUtils();

  const bulkCreate = api.row.bulkCreate.useMutation({
    onSuccess: async (data) => {
      alert(data.message);
      // Invalidate queries to refresh the data
      await utils.row.invalidate();
      setIsCreating(false);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleCreate100k = () => {
    setIsCreating(true);
    bulkCreate.mutate({ tableId, count: 100000 });
  };

  return (
    <ToolbarPopoversProvider>
      <div className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-3">
        {/* Left: Hamburger + View dropdown */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSideNav}
            className="cursor-pointer rounded p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu size={16} />
          </button>

          <button className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100 md:px-2.5">
            <LayoutGrid size={16} />
            <span className="hidden md:inline">Grid view</span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Right: Toolbar actions */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            icon={<Database size={16} />}
            label={isCreating ? "Creating..." : "Create 100k rows"}
            onClick={handleCreate100k}
          />
          <HideFieldsPopover tableId={tableId} />
          <FilterPopover tableId={tableId} />
          <ToolbarButton icon={<LayoutList size={16} />} label="Group" />
          <SortPopover tableId={tableId} />
          <ToolbarButton icon={<Baseline size={16} />} label="Color" />

          <button className="cursor-pointer rounded p-1.5 text-gray-600 hover:bg-gray-100">
            <GripHorizontal size={16} />
          </button>

          <ToolbarButton
            icon={<SquareArrowOutUpRight size={16} />}
            label="Share and sync"
          />

          <SearchInput />
        </div>
      </div>
    </ToolbarPopoversProvider>
  );
}
