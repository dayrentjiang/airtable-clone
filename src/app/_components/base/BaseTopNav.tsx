"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ChevronDown, History, ExternalLink } from "lucide-react";
import { useBaseContext } from "./_state/base-context";
import { RenameBaseModal } from "./BaseTopNav/RenameBaseModal";
import { api } from "~/trpc/react";

interface BaseTopNavProps {
  baseId: string;
  onBaseNameClick?: () => void;
}

function BaseIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-600">
      <Image
        src="/images/airtable_bw_logo.png"
        alt="Airtable"
        width={20}
        height={20}
        className="h-8 w-8"
      />
    </div>
  );
}

const tabs = ["Data", "Automations", "Interfaces", "Forms"] as const;

export function BaseTopNav({ baseId, onBaseNameClick }: BaseTopNavProps) {
  // Get base name from context instead of props
  const { base } = useBaseContext();
  const baseName = base?.name ?? "Untitled Base";

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const baseNameButtonRef = useRef<HTMLButtonElement>(null);
  const utils = api.useUtils();

  const updateBaseMutation = api.base.update.useMutation({
    onMutate: async (newBase) => {
      // Cancel any outgoing refetches
      await utils.base.getById.cancel({ id: baseId });

      // Snapshot the previous value
      const previousBase = utils.base.getById.getData({ id: baseId });

      // Optimistically update to the new value
      utils.base.getById.setData({ id: baseId }, (old) => {
        if (!old) return old;
        return { ...old, name: newBase.name };
      });

      // Return a context with the previous value
      return { previousBase };
    },
    onError: (err, newBase, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBase) {
        utils.base.getById.setData({ id: baseId }, context.previousBase);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      void utils.base.getById.invalidate({ id: baseId });
    },
  });

  const handleDoubleClick = () => {
    setIsRenameModalOpen(true);
  };

  const handleRename = (newName: string) => {
    updateBaseMutation.mutate({
      id: baseId,
      name: newName,
    });
  };

  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-2 md:px-4">
      {/* Left: Base icon + name */}
      <div className="flex min-w-0 flex-1 items-center">
        <button
          ref={baseNameButtonRef}
          onClick={onBaseNameClick}
          onDoubleClick={handleDoubleClick}
          className="flex min-w-0 items-center gap-2 rounded px-1 py-2 hover:cursor-pointer md:px-2"
        >
          <BaseIcon />
          <span className="truncate font-bold text-gray-800">{baseName}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>
      </div>

      {/* Center: Tabs */}
      <nav className="flex h-full items-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`relative h-full px-1.5 text-xs font-semibold hover:cursor-pointer sm:px-2 ${
              tab === "Data"
                ? "text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
            {tab === "Data" && (
              <div className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-cyan-700 sm:w-8" />
            )}
          </button>
        ))}
      </nav>

      {/* Right: History, Trial, Launch, Share */}
      <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
        {/* History */}
        <button className="rounded-4xl p-1.5 text-gray-700 hover:cursor-pointer hover:bg-gray-100">
          <History size={14} />
        </button>

        {/* Trial badge */}
        <span className="hidden rounded-2xl bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:cursor-pointer lg:block">
          Trial: 13 days left
        </span>

        <div className="flex gap-1 md:gap-2">
          {/* Launch button */}
          <button className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-1.5 text-xs font-medium text-black shadow-sm hover:cursor-pointer hover:shadow-md md:px-2.5 md:py-1.5">
            <ExternalLink size={14} />
            <span className="hidden md:inline">Launch</span>
          </button>

          {/* Share button */}
          <button className="hover:scale-101 rounded-md bg-cyan-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:cursor-pointer md:px-3.5">
            Share
          </button>
        </div>
      </div>

      {/* Rename Base Modal */}
      <RenameBaseModal
        open={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        baseName={baseName}
        onRename={handleRename}
        anchorEl={baseNameButtonRef.current}
      />
    </header>
  );
}
