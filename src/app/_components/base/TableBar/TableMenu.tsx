"use client";

import {
  ChevronRight,
  Pencil,
  Trash2,
  EyeOff,
  Copy,
  Calendar,
  FileText,
  Lock,
  X,
  Table,
} from "lucide-react";

interface TableMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onRename: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export function TableMenu({
  isOpen,
  position,
  onRename,
  onDelete,
  menuRef,
}: TableMenuProps) {
  console.log("TableMenu render - isOpen:", isOpen, "position:", position);
  
  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-100 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {/* Import data */}
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span>Import data</span>
        </div>
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="my-1 border-t border-gray-200" />

      {/* Rename table */}
      <button
        onClick={() => {
          console.log("TableMenu: Rename button clicked");
          onRename();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <Pencil className="h-4 w-4" />
        <span>Rename table</span>
      </button>

      {/* Hide table */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <EyeOff className="h-4 w-4" />
        <span>Hide table</span>
      </button>

      {/* Manage fields */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <Table className="h-4 w-4" />
        <span>Manage fields</span>
      </button>

      {/* Duplicate table */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <Copy className="h-4 w-4" />
        <span>Duplicate table</span>
      </button>

      <div className="my-1 border-t border-gray-200" />

      {/* Configure date dependencies */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <Calendar className="h-4 w-4" />
        <span>Configure date dependencies</span>
      </button>

      <div className="my-1 border-t border-gray-200" />

      {/* Edit table description */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <FileText className="h-4 w-4" />
        <span>Edit table description</span>
      </button>

      {/* Edit table permissions */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <Lock className="h-4 w-4" />
        <span>Edit table permissions</span>
      </button>

      <div className="my-1 border-t border-gray-200" />

      {/* Clear data */}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
        <X className="h-4 w-4" />
        <span>Clear data</span>
      </button>

      {/* Delete table */}
      <button
        onClick={() => {
          console.log("TableMenu: Delete button clicked");
          onDelete();
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete table</span>
      </button>
    </div>
  );
}
