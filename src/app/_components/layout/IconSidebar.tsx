"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle, Bell } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

interface IconSidebarProps {
  userInitial?: string;
}

export function IconSidebar({ userInitial = "D" }: IconSidebarProps) {
  const router = useRouter();
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [isHoveringHelp, setIsHoveringHelp] = useState(false);
  const [isHoveringBell, setIsHoveringBell] = useState(false);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <aside className="flex w-14 flex-col items-center border-r border-gray-200 bg-white py-3">
      {/* Top: Airtable logo */}
      <button
        className="relative rounded-lg p-1.5 hover:cursor-pointer hover:bg-gray-100"
        onMouseEnter={() => setIsHoveringLogo(true)}
        onMouseLeave={() => setIsHoveringLogo(false)}
        onClick={handleBackToHome}
      >
        <div className="relative h-6 w-6">
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out"
            style={{
              opacity: isHoveringLogo ? 0 : 1,
              transform: isHoveringLogo ? "scale(0.5)" : "scale(1)",
            }}
          >
            <Image
              src="/images/airtable_black.webp"
              alt="Airtable"
              width={22}
              height={22}
              priority
            />
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out"
            style={{
              opacity: isHoveringLogo ? 1 : 0,
              transform: isHoveringLogo ? "scale(1)" : "scale(0.5)",
            }}
          >
            <ArrowLeft size={14} className="text-gray-700" />
          </div>
        </div>

        <Tooltip
          text="Back to home"
          visible={isHoveringLogo}
          position="right"
        />
      </button>

      {/* Middle: spacer */}
      <div className="flex-1" />

      <div className="flex flex-col items-center gap-1">
        {/* Bottom: Help, Bell, Avatar */}
        <button
          className="relative rounded-4xl p-1.5 text-gray-700 hover:cursor-pointer hover:bg-gray-100"
          onMouseEnter={() => setIsHoveringHelp(true)}
          onMouseLeave={() => setIsHoveringHelp(false)}
        >
          <HelpCircle size={16} />
          <Tooltip text="Help" visible={isHoveringHelp} position="right" />
        </button>
        <button
          className="relative mt-2 rounded-4xl p-1.5 text-gray-700 hover:cursor-pointer hover:bg-gray-100"
          onMouseEnter={() => setIsHoveringBell(true)}
          onMouseLeave={() => setIsHoveringBell(false)}
        >
          <Bell size={16} />
          <Tooltip
            text="Notifications"
            visible={isHoveringBell}
            position="right"
          />
        </button>
        <button
          className="relative mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-semibold text-white hover:cursor-pointer hover:bg-yellow-600"
          onMouseEnter={() => setIsHoveringAvatar(true)}
          onMouseLeave={() => setIsHoveringAvatar(false)}
        >
          {userInitial}
          <Tooltip text="Account" visible={isHoveringAvatar} position="right" />
        </button>
      </div>
    </aside>
  );
}
