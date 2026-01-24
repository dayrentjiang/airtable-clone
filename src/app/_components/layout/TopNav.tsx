"use client";

import type { Session } from "next-auth";
import Image from "next/image";

function Logo() {
  return (
    <Image
      src="/images/airtable_logo.webp"
      alt="Airtable"
      width={28}
      height={24}
      priority
    />
  );
}

interface TopNavProps {
  session: Session | null;
  onMenuClick?: () => void;
}

export function TopNav({ session, onMenuClick }: TopNavProps) {
  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        >
          {/* Hamburger icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
        <Logo />
      </div>

      {/* Center: Search */}
      <div className="flex flex-1 justify-center px-4">
        <button className="flex h-9 w-full max-w-md items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 text-gray-500 hover:bg-gray-100">
          {/* Search icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-sm">Search...</span>
          <span className="ml-auto rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-400">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right: Help, Bell, Avatar */}
      <div className="flex items-center gap-2">
        {/* Help */}
        <button className="flex items-center gap-1 rounded px-2 py-1.5 text-gray-600 hover:bg-gray-100">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
          <span className="text-sm">Help</span>
        </button>

        {/* Bell */}
        <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Avatar */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {userInitial}
        </button>
      </div>
    </header>
  );
}
