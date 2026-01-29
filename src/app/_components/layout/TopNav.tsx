"use client";

import type { Session } from "next-auth";
import Image from "next/image";
import { useState, useRef } from "react";
import { Menu, Search, HelpCircle, Bell } from "lucide-react";
import { UserMenu } from "../ui/UserMenu";

function Logo() {
  return (
    <Image
      src="/images/airtable_logo_with_text.png"
      alt="Airtable"
      width={100}
      height={28}
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
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <Logo />
      </div>

      {/* Center: Search */}
      <div className="flex flex-1 justify-center px-4">
        <button className="flex h-8 w-full max-w-sm items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-gray-500 shadow-sm hover:cursor-pointer">
          <Search size={16} />
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
          <HelpCircle size={18} />
          <span className="text-sm">Help</span>
        </button>

        {/* Bell */}
        <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
          <Bell size={18} />
        </button>

        {/* Avatar */}
        <button
          ref={avatarButtonRef}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-medium text-white hover:bg-yellow-600"
        >
          {userInitial}
        </button>
      </div>

      {/* User Menu */}
      <UserMenu
        userName={userName}
        userEmail={userEmail}
        userInitial={userInitial}
        open={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        anchorEl={avatarButtonRef.current}
      />
    </header>
  );
}
