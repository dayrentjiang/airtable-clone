"use client";

import { useState, useRef, useEffect } from "react";
import { Users, User, Lock } from "lucide-react";
import { Warning } from "../../ui/Warning";

interface CreateViewModalProps {
  viewName: string;
  onViewNameChange: (name: string) => void;
  onCancel: () => void;
  onCreate: () => void;
  isCreating: boolean;
  existingViewNames?: string[];
}

export function CreateViewModal({
  viewName,
  onViewNameChange,
  onCancel,
  onCreate,
  isCreating,
  existingViewNames = [],
}: CreateViewModalProps) {
  const [editPermission, setEditPermission] = useState<
    "collaborative" | "personal" | "locked"
  >("collaborative");
  const [showWarning, setShowWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if the name is duplicate (case-insensitive)
  const isDuplicate = existingViewNames.some(
    (existingName) =>
      existingName.toLowerCase() === viewName.trim().toLowerCase(),
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleCreate = () => {
    if (viewName.trim() && !isDuplicate) {
      onCreate();
    } else if (isDuplicate) {
      setShowWarning(true);
    }
  };

  return (
    <>
      {/* Invisible backdrop to detect outside clicks */}
      <div className="fixed inset-0 z-40" onClick={onCancel} />

      {/* Modal positioned next to sidebar */}
      <div className="fixed top-16 left-76 z-50 flex h-full items-start justify-start pt-20 pl-8">
        <div className="w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
          {/* View Name Input */}
          <div className="mb-5">
            <input
              ref={inputRef}
              type="text"
              value={viewName}
              onChange={(e) => {
                onViewNameChange(e.target.value);
                setShowWarning(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && viewName.trim()) {
                  handleCreate();
                } else if (e.key === "Escape") {
                  onCancel();
                }
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter view name"
            />
            {showWarning && isDuplicate && (
              <Warning message="Please enter a unique view name" />
            )}
          </div>

          {/* Who can edit section */}
          <div className="mb-5">
            <div className="mb-3 text-sm font-medium text-gray-900">
              Who can edit
            </div>
            <div className="flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="permission"
                  value="collaborative"
                  checked={editPermission === "collaborative"}
                  onChange={(e) =>
                    setEditPermission(
                      e.target.value as "collaborative" | "personal" | "locked",
                    )
                  }
                  className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Users className="h-3 w-3 text-gray-600" />
                <span className="text-xs text-gray-700">Collaborative</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="permission"
                  value="personal"
                  checked={editPermission === "personal"}
                  onChange={(e) =>
                    setEditPermission(
                      e.target.value as "collaborative" | "personal" | "locked",
                    )
                  }
                  className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <User className="h-3 w-3 text-gray-600" />
                <span className="text-xs text-gray-700">Personal</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="permission"
                  value="locked"
                  checked={editPermission === "locked"}
                  onChange={(e) =>
                    setEditPermission(
                      e.target.value as "collaborative" | "personal" | "locked",
                    )
                  }
                  className="h-3 w-3 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Lock className="h-3 w-3 text-gray-600" />
                <span className="text-xs text-gray-700">Locked</span>
              </label>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              All collaborators can edit the configuration
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!viewName.trim() || isCreating}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create new view
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
