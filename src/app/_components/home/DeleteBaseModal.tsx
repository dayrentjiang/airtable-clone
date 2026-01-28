"use client";

import { useEffect, useRef, useState } from "react";

interface DeleteBaseModalProps {
  baseName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export function DeleteBaseModal({
  baseName,
  isOpen,
  onClose,
  onConfirm,
  triggerRef,
}: DeleteBaseModalProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on trigger element
  useEffect(() => {
    if (isOpen && triggerRef.current && popupRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();

      // Position below the card
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;

      // Adjust if popup goes off screen
      if (top + popupRect.height > window.innerHeight) {
        top = triggerRect.top - popupRect.height - 8;
      }

      if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 16;
      }

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
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

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 rounded-lg border border-gray-200 bg-white p-5 shadow-xl"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {/* Title */}
      <h2 className="text-base font-semibold text-gray-900">
        Are you sure you want to delete {baseName}?
      </h2>

      {/* Description */}
      <p className="mt-2 flex items-start gap-1 text-sm text-gray-600">
        <span>Recently deleted apps can be restored from trash.</span>
        <button className="inline-flex shrink-0 items-center text-gray-500 hover:text-gray-700">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </p>

      {/* Actions */}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
