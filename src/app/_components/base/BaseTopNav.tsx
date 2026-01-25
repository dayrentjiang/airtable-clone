"use client";

import Image from "next/image";
import { ChevronDown, History, ExternalLink } from "lucide-react";

interface BaseTopNavProps {
  baseName: string;
  onBaseNameClick?: () => void;
}

function BaseIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-600">
      <Image
        src="/images/airtable_black.webp"
        alt="Airtable"
        width={20}
        height={20}
        className="h-5 w-5"
      />
    </div>
  );
}

const tabs = ["Data", "Automations", "Interfaces", "Forms"] as const;

export function BaseTopNav({ baseName, onBaseNameClick }: BaseTopNavProps) {
  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-2 md:px-4">
      {/* Left: Base icon + name */}
      <div className="flex min-w-0 flex-1 items-center">
        <button
          onClick={onBaseNameClick}
          className="flex min-w-0 items-center gap-2 rounded px-1 py-2 hover:cursor-pointer md:px-2"
        >
          <BaseIcon />
          <span className="truncate font-bold text-gray-800">
            {baseName}
          </span>
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
          <button className="rounded-md bg-cyan-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:scale-101 hover:cursor-pointer md:px-3.5">
            Share
          </button>
        </div>
      </div>
    </header>
  );
}
