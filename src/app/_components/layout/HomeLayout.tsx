"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { TopNav } from "./TopNav";
import { SideNav } from "./SideNav";

interface HomeLayoutProps {
  session: Session | null;
  children: React.ReactNode;
}

export function HomeLayout({ session, children }: HomeLayoutProps) {
  const [isSideNavOpen, setIsSideNavOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopNav session={session} onMenuClick={() => setIsSideNavOpen(!isSideNavOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {isSideNavOpen && <SideNav />}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
