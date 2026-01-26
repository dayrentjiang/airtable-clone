"use client";

import { useState, useEffect, useRef } from "react";
import { Table } from "lucide-react";

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function AddTableModal({
  isOpen,
  onClose,
  onAdd,
  anchorRef,
}: AddTableModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const top = anchorRect ? anchorRect.bottom + 4 : 0;
  const left = anchorRect ? anchorRect.left : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-110"
        onClick={onClose}
      />
      <div
        ref={dropdownRef}
        className="fixed z-120 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        style={{ top, left }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Table className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Add table</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name your table"
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Add
          </button>
        </div>
      </div>
    </>
  );
}
