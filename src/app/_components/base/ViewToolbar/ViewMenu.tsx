"use client";

import { useState } from "react";
import {
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Download,
  Printer,
  Users,
  ArrowRight,
  Info,
  FileText,
} from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";

interface ViewMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onRename: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  canDelete: boolean;
}

export function ViewMenu({
  isOpen,
  position,
  onRename,
  onDelete,
  menuRef,
  canDelete,
}: ViewMenuProps) {
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[110] w-sm rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex flex-col py-0.5">
        {/* Collaborative view */}
        <button className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-100">
          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-gray-500" />
            <div className="flex flex-col">
              <span className="text-sm text-gray-900">Collaborative view</span>
              <span className="text-[11px] text-gray-500">
                Editors and up can edit the view configuration
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Rename view */}
        <button
          onClick={onRename}
          className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100"
        >
          <Pencil className="h-3.5 w-3.5 text-gray-500" />
          <span>Rename view</span>
        </button>

        {/* Edit view description */}
        <button className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100">
          <Info className="h-3.5 w-3.5 text-gray-500" />
          <span>Edit view description</span>
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Duplicate view */}
        <button className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100">
          <Copy className="h-3.5 w-3.5 text-gray-500" />
          <span>Duplicate view</span>
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Download CSV */}
        <button className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100">
          <Download className="h-3.5 w-3.5 text-gray-500" />
          <span>Download CSV</span>
        </button>

        {/* Print view */}
        <button className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] text-gray-900 hover:bg-gray-100">
          <Printer className="h-3.5 w-3.5 text-gray-500" />
          <span>Print view</span>
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Delete view */}
        <div className="relative">
          <button
            onClick={canDelete ? onDelete : undefined}
            onMouseEnter={() => !canDelete && setShowDeleteTooltip(true)}
            onMouseLeave={() => setShowDeleteTooltip(false)}
            disabled={!canDelete}
            className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] ${
              canDelete
                ? "cursor-pointer text-red-600 hover:bg-gray-100"
                : "cursor-not-allowed text-red-300"
            }`}
          >
            <Trash2 className="h-4 w-4 text-gray-400" />
            <span>Delete view</span>
          </button>
          {!canDelete && (
            <Tooltip
              text="You can't delete a view when it's the only view on the table"
              visible={showDeleteTooltip}
              position="right"
              delay={200}
            />
          )}
        </div>
      </div>
    </div>
  );
}
