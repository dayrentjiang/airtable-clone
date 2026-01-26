"use client";

import { useRef, useEffect } from "react";
import { Star, Pencil, Copy, Trash2 } from "lucide-react";

interface ViewContextMenuProps {
  viewId: string;
  viewName: string;
  x: number;
  y: number;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ViewContextMenu({
  x,
  y,
  onClose,
  onRename,
  onDelete,
}: ViewContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
        disabled
      >
        <Star className="h-4 w-4" />
        <span>Add to 'My favorites'</span>
      </button>

      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Pencil className="h-4 w-4 text-gray-600" />
        <span>Rename view</span>
      </button>

      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
        disabled
      >
        <Copy className="h-4 w-4" />
        <span>Duplicate view</span>
      </button>

      <div className="my-1 border-t border-gray-100" />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete view</span>
      </button>
    </div>
  );
}
