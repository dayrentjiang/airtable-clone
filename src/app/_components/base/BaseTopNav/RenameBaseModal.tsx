"use client";

import { useRef, useEffect, useState } from "react";
import { Star, ChevronRight } from "lucide-react";
import { Warning } from "../../ui/Warning";

interface RenameBaseModalProps {
  open: boolean;
  onClose: () => void;
  baseName: string;
  onRename: (newName: string) => void;
  anchorEl?: HTMLElement | null;
  existingBaseNames?: string[];
}

export function RenameBaseModal({
  open,
  onClose,
  baseName,
  onRename,
  anchorEl,
  existingBaseNames = [],
}: RenameBaseModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState(baseName);
  const [showWarning, setShowWarning] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Check if the name is duplicate (case-insensitive, excluding current name)
  const isDuplicate = existingBaseNames.some(
    (existingName) =>
      existingName.toLowerCase() !== baseName.toLowerCase() &&
      existingName.toLowerCase() === newName.trim().toLowerCase(),
  );

  useEffect(() => {
    if (open && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [open, anchorEl]);

  useEffect(() => {
    if (open) {
      setNewName(baseName);
      setShowWarning(false);
      // Focus and select the text in the input
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, baseName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, anchorEl]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) {
      setShowWarning(true);
      return;
    }
    if (newName.trim() && newName !== baseName) {
      onRename(newName.trim());
    }
    onClose();
  };

  const handleBlur = () => {
    // Auto-submit on blur if name changed
    if (isDuplicate) {
      setShowWarning(true);
      return;
    }
    if (newName.trim() && newName !== baseName) {
      onRename(newName.trim());
    }
  };

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      }}
      className="w-80 rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      <div className="p-4">
        <form onSubmit={handleSubmit}>
          {/* Base Name Input */}
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setShowWarning(false);
              }}
              onBlur={handleBlur}
              className="w-full rounded-md border border-blue-500 px-3 py-2 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter base name"
            />
            {showWarning && isDuplicate && (
              <Warning message="Please enter a unique base name" />
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Appearance */}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <ChevronRight size={16} className="text-gray-400" />
                <span>Appearance</span>
              </div>
            </button>

            {/* Base guide */}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <ChevronRight size={16} className="text-gray-400" />
                <span>Base guide</span>
              </div>
            </button>
          </div>

          {/* Hidden submit button for Enter key */}
          <button type="submit" className="hidden" />
        </form>
      </div>
    </div>
  );
}
