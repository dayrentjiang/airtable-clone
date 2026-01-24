"use client";

import { Plus } from "lucide-react";

export function AddColumnButton() {
  return (
    <div className="shrink-0">
      {/* Header cell with + button - matches th padding */}
      <div className="sticky top-0 z-10 flex w-23 items-center justify-center border-b border-r border-gray-300 bg-gray-50 px-2 py-2">
        <button
          type="button"
          className="flex items-center justify-center text-gray-400 hover:text-gray-600"
          onClick={() => {
            // No functionality for now
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
