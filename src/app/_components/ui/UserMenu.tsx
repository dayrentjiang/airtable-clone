"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  User,
  Users,
  Bell,
  Globe,
  Palette,
  Mail,
  TrendingUp,
  UserPlus,
  Link2,
  Box,
  Trash2,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface UserMenuProps {
  userName?: string;
  userEmail?: string;
  userInitial?: string;
  open: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function UserMenu({
  userName,
  userEmail,
  userInitial = "D",
  open,
  onClose,
  anchorEl,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  useEffect(() => {
    if (open && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const menuWidth = 320; // 80 * 4 (w-80)
      const menuHeight = 600; // approximate height
      
      const newPosition: { top?: number; bottom?: number; left?: number; right?: number } = {};
      
      // Horizontal positioning
      if (rect.right + menuWidth + 8 < windowWidth) {
        // Position to the right of the avatar
        newPosition.left = rect.right + 8;
      } else if (rect.left - menuWidth - 8 > 0) {
        // Position to the left of the avatar
        newPosition.right = windowWidth - rect.left + 8;
      } else {
        // Center horizontally
        newPosition.left = Math.max(8, (windowWidth - menuWidth) / 2);
      }
      
      // Vertical positioning
      if (rect.bottom + menuHeight < windowHeight) {
        // Position below the avatar
        newPosition.top = rect.top;
      } else {
        // Position above or align to bottom
        newPosition.bottom = Math.max(8, windowHeight - rect.bottom);
      }
      
      setPosition(newPosition);
    }
  }, [open, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
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
  }, [open, onClose, anchorEl]);

  const handleLogout = async () => {
    // Sign out directly without confirmation, redirect to login
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  if (!open) return null;

  const positionStyle: React.CSSProperties = {
    top: position.top !== undefined ? `${position.top}px` : undefined,
    bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
    left: position.left !== undefined ? `${position.left}px` : undefined,
    right: position.right !== undefined ? `${position.right}px` : undefined,
  };

  return (
    <div
      ref={menuRef}
      style={positionStyle}
      className="fixed z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      {/* User Info Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-base font-semibold text-white">
            {userInitial}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-sm font-semibold text-gray-900">
              {userName}
            </div>
            <div className="truncate text-xs text-gray-600">{userEmail}</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {/* Account */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <User size={16} className="text-gray-500" />
          <span>Account</span>
        </button>

        {/* Manage groups */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <Users size={16} className="text-gray-500" />
          <span>Manage groups</span>
          <span className="ml-auto rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Business
          </span>
        </button>

        {/* Notification preferences */}
        <button className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-gray-500" />
            <span>Notification preferences</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        {/* Language preferences */}
        <button className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-gray-500" />
            <span>Language preferences</span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        {/* Appearance */}
        <button className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <Palette size={16} className="text-gray-500" />
            <span>Appearance</span>
            <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
              Beta
            </span>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Contact sales */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <Mail size={16} className="text-gray-500" />
          <span>Contact sales</span>
        </button>

        {/* Upgrade */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <TrendingUp size={16} className="text-gray-500" />
          <span>Upgrade</span>
        </button>

        {/* Tell a friend */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <UserPlus size={16} className="text-gray-500" />
          <span>Tell a friend</span>
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Integrations */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <Link2 size={16} className="text-gray-500" />
          <span>Integrations</span>
        </button>

        {/* Builder hub */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <Box size={16} className="text-gray-500" />
          <span>Builder hub</span>
        </button>

        <div className="my-1 border-t border-gray-200" />

        {/* Trash */}
        <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
          <Trash2 size={16} className="text-gray-500" />
          <span>Trash</span>
        </button>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut size={16} className="text-gray-500" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
