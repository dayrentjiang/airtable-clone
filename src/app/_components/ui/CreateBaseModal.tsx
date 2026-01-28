"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";

interface CreateBaseModalProps {
  open: boolean;
  onClose: () => void;
  onCreateBlankBase: () => void;
}

export function CreateBaseModal({
  open,
  onClose,
  onCreateBlankBase,
}: CreateBaseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
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
  }, [open, onClose]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl rounded-lg bg-white p-8 shadow-xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="mb-8 text-2xl font-semibold text-gray-900">
          How do you want to start?
        </h2>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Build with Omni - Disabled */}
          <button
            disabled
            className="group relative flex cursor-not-allowed flex-col items-start rounded-lg border-2 border-gray-200 bg-linear-to-br from-pink-50 to-purple-50 p-8 text-left opacity-60 transition-all"
          >
            {/* Placeholder for image */}
            <div className="mb-6 flex h-48 w-full items-center justify-center rounded-lg bg-linear-to-br from-pink-200 to-purple-300">
              <div className="text-center">
                <div className="mb-2 text-6xl">🤖</div>
                <div className="text-sm text-purple-700">AI Illustration</div>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Build an app with Omni
              </h3>
              <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                New
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Use AI to build a custom app tailored to your workflow.
            </p>
          </button>

          {/* Build on your own - Active */}
          <button
            onClick={onCreateBlankBase}
            className="group relative flex flex-col items-start rounded-lg border-2 border-gray-200 bg-linear-to-br from-blue-50 to-indigo-50 p-8 text-left transition-all hover:border-blue-400 hover:shadow-lg"
          >
            {/* Placeholder for image */}
            <div className="mb-6 flex h-48 w-full items-center justify-center rounded-lg bg-linear-to-br from-blue-200 to-indigo-300">
              <div className="text-center">
                <div className="mb-2 text-6xl">📊</div>
                <div className="text-sm text-blue-700">App Illustration</div>
              </div>
            </div>

            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Build an app on your own
            </h3>
            <p className="text-sm text-gray-600">
              Start with a blank app and build your ideal workflow.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
