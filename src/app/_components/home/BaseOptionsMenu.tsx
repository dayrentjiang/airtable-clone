"use client";

import { useState, useRef, useEffect } from "react";
import {
  Pencil,
  Copy,
  ArrowRight,
  Folder,
  Paintbrush,
  Trash2,
} from "lucide-react";

interface BaseOptionsMenuProps {
  baseId: string;
  baseName: string;
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function BaseOptionsMenu({
  baseId,
  baseName,
  isOpen,
  onClose,
  onRename,
  onDelete,
  triggerRef,
}: BaseOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on trigger element
  useEffect(() => {
    if (isOpen && triggerRef.current && menuRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();

      let top = triggerRect.bottom + 4;
      let left = triggerRect.right - menuRect.width;

      // Adjust if menu goes off screen
      if (top + menuRect.height > window.innerHeight) {
        top = triggerRect.top - menuRect.height - 4;
      }

      if (left < 0) {
        left = triggerRect.left;
      }

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleRename = () => {
    onRename();
    onClose();
  };

  const handleDuplicate = () => {
    console.log("Duplicate base:", baseId);
    // TODO: Implement duplicate functionality
    onClose();
  };

  const handleMove = () => {
    console.log("Move base:", baseId);
    // TODO: Implement move functionality
    onClose();
  };

  const handleGoToWorkspace = () => {
    console.log("Go to workspace for base:", baseId);
    // TODO: Implement go to workspace functionality
    onClose();
  };

  const handleCustomizeAppearance = () => {
    console.log("Customize appearance for base:", baseId);
    // TODO: Implement customize appearance functionality
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-lg border border-gray-200 bg-white py-1.5 shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {/* Menu items */}
      <button
        onClick={handleRename}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <Pencil size={16} className="text-gray-500" />
        <span>Rename</span>
      </button>

      <button
        onClick={handleDuplicate}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <Copy size={16} className="text-gray-500" />
        <span>Duplicate</span>
      </button>

      <button
        onClick={handleMove}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <ArrowRight size={16} className="text-gray-500" />
        <span>Move</span>
      </button>

      <button
        onClick={handleGoToWorkspace}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <Folder size={16} className="text-gray-500" />
        <span>Go to workspace</span>
      </button>

      <button
        onClick={handleCustomizeAppearance}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
      >
        <Paintbrush size={16} className="text-gray-500" />
        <span>Customize appearance</span>
      </button>

      {/* Divider */}
      <div className="my-1.5 border-t border-gray-200" />

      {/* Delete button - red text */}
      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 size={16} />
        <span>Delete</span>
      </button>
    </div>
  );
}
