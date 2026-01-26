"use client";

import { useState, useEffect, useRef } from "react";
import { HelpCircle, ChevronDown, Plus } from "lucide-react";

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
  const [name, setName] = useState("Table 1");
  const [recordName] = useState("Record");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset and focus when opened
  useEffect(() => {
    if (isOpen) {
      setName("New Table");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen]);

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

    // Delay adding the listener to avoid closing on the same click that opened it
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
      <div className="fixed inset-0 z-110" onClick={onClose} />
      <div
        ref={dropdownRef}
        className="fixed z-120 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        style={{ top, left }}
      >
        <div className="p-4">
          {/* Table name input */}
          <div className="mb-4">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border-2 border-blue-500 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
              placeholder="Table name"
            />
          </div>

          {/* Record name section */}
          <div className="mb-3">
            <div className="mb-2 flex items-center gap-1">
              <span className="text-sm text-gray-700">
                What should each record be called?
              </span>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </div>

            <div className="relative">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>{recordName}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="text-xs text-gray-500">
            <span>Examples: </span>
            <span className="text-gray-600">
              <Plus className="inline h-3 w-3" /> Add {recordName.toLowerCase()}
            </span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-600">
              Send {recordName.toLowerCase()}s
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
