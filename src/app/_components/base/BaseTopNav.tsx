"use client";

import { Grid2X2, ChevronDown, History, ExternalLink } from "lucide-react";

interface BaseTopNavProps {
  baseName: string;
  onBaseNameClick?: () => void;
}

function BaseIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-600">
      <Grid2X2 size={16} className="text-white" />
    </div>
  );
}

const tabs = ["Data", "Automations", "Interfaces", "Forms"] as const;

export function BaseTopNav({ baseName, onBaseNameClick }: BaseTopNavProps) {
  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-4">
      {/* Left: Base icon + name */}
      <div className="flex flex-1 items-center">
        <button
          onClick={onBaseNameClick}
          className="flex items-center gap-2 rounded px-2 py-2 hover:cursor-pointer"
        >
          <BaseIcon />
          <span className="font-bold text-gray-800">{baseName}</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Center: Tabs */}
      <nav className="flex h-full items-center">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`relative h-full px-2 text-xs font-semibold hover:cursor-pointer ${
              tab === "Data"
                ? "text-gray-900"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
            {tab === "Data" && (
              <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 bg-cyan-700" />
            )}
          </button>
        ))}
      </nav>

      {/* Right: History, Trial, Launch, Share */}
      <div className="flex flex-1 items-center justify-end gap-4">
        {/* History */}
        <button className="rounded-4xl p-1.5 text-gray-700 hover:cursor-pointer hover:bg-gray-100">
          <History size={14} />
        </button>

        {/* Trial badge */}
        <span className="rounded-2xl bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:cursor-pointer">
          Trial: 13 days left
        </span>

        <div className="flex gap-2">
          {/* Launch button */}
          <button className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-black shadow-sm hover:cursor-pointer hover:shadow-md">
            <ExternalLink size={14} />
            Launch
          </button>

          {/* Share button */}
          <button className="rounded-md bg-cyan-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:scale-101 hover:cursor-pointer">
            Share
          </button>
        </div>
      </div>
    </header>
  );
}
