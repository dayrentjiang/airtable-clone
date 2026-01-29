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
            className="group relative flex cursor-not-allowed flex-col items-start rounded-lg border-2 border-gray-200 bg-linear-to-br from-pink-50 to-purple-50 p-0 text-left opacity-60 transition-all"
          >
            {/* Image */}
            <div className="h-40 w-full overflow-hidden rounded-t-lg">
              <img
                src="/images/Omni_2x.png"
                alt="Build with Omni"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Separator */}
            <div className="w-full border-t border-gray-200"></div>

            {/* Content */}
            <div className="bg-white p-6">
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
            </div>
          </button>

          {/* Build on your own - Active */}
          <button
            onClick={onCreateBlankBase}
            className="group relative flex flex-col items-start rounded-lg border-2 border-gray-200 bg-linear-to-br from-blue-50 to-indigo-50 p-0 text-left transition-all hover:cursor-pointer hover:shadow-2xl hover:shadow-lg"
          >
            {/* Image */}
            <div className="h-40 w-full overflow-hidden rounded-t-lg">
              <img
                src="/images/start-with-data.png"
                alt="Build on your own"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Separator */}
            <div className="w-full border-t border-gray-200"></div>

            {/* Content */}
            <div className="bg-white p-6">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Build an app on your own
              </h3>
              <p className="text-sm text-gray-600">
                Start with a blank app and build your ideal workflow.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
