"use client";

import { useEffect, useRef } from "react";
import { HelpCircle } from "lucide-react";

interface DeleteTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function DeleteTableModal({
  isOpen,
  onClose,
  onDelete,
  anchorRef,
}: DeleteTableModalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const top = anchorRect ? anchorRect.bottom + 4 : 0;
  const left = anchorRect ? anchorRect.left : 0;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-100 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ top, left }}
    >
      <div className="p-4">
        <p className="mb-2 text-sm font-medium text-gray-900">
          Are you sure you want to delete this table?
        </p>
        <div className="flex items-start gap-1 text-xs text-gray-500">
          <span>Recently deleted tables can be restored from trash.</span>
          <HelpCircle className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
