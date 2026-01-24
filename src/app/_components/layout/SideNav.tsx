"use client";

import { useState } from "react";

// Icons
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function SharedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function TemplatesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function MarketplaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`transition-transform ${expanded ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
  children?: React.ReactNode;
}

function NavItem({
  icon,
  label,
  active,
  expandable,
  expanded,
  onToggle,
  onAdd,
  children,
}: NavItemProps) {
  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer ${
          active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
        }`}
        onClick={onToggle}
      >
        {expandable && (
          <span className="text-gray-400">
            <ChevronIcon expanded={expanded ?? false} />
          </span>
        )}
        <span className="text-gray-600">{icon}</span>
        <span className="flex-1 text-gray-700">{label}</span>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded"
          >
            <PlusIcon />
          </button>
        )}
        {expandable && !onAdd && (
          <span className="opacity-0 group-hover:opacity-100 text-gray-400">
            <ChevronIcon expanded={false} />
          </span>
        )}
      </div>
      {expanded && children && <div className="ml-6">{children}</div>}
    </div>
  );
}

export function SideNav() {
  const [starredExpanded, setStarredExpanded] = useState(true);
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);

  return (
    <nav className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Main nav items */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Home */}
        <NavItem icon={<HomeIcon />} label="Home" active />

        {/* Starred */}
        <NavItem
          icon={<StarIcon />}
          label="Starred"
          expandable
          expanded={starredExpanded}
          onToggle={() => setStarredExpanded(!starredExpanded)}
        >
          <div className="py-1 pl-2 text-sm text-gray-600 hover:bg-gray-100 rounded cursor-pointer">
            My First Workspace
          </div>
        </NavItem>

        {/* Shared */}
        <NavItem icon={<SharedIcon />} label="Shared" />

        {/* Workspaces */}
        <NavItem
          icon={<WorkspaceIcon />}
          label="Workspaces"
          expandable
          expanded={workspacesExpanded}
          onToggle={() => setWorkspacesExpanded(!workspacesExpanded)}
          onAdd={() => console.log("Add workspace")}
        >
          {/* Workspace items will be loaded from API */}
          <div className="py-1 pl-2 text-sm text-gray-500 italic">
            No workspaces yet
          </div>
        </NavItem>

        {/* Divider */}
        <hr className="my-4 border-gray-200" />

        {/* Templates and apps */}
        <NavItem icon={<TemplatesIcon />} label="Templates and apps" />

        {/* Marketplace */}
        <NavItem icon={<MarketplaceIcon />} label="Marketplace" />

        {/* Import */}
        <NavItem icon={<ImportIcon />} label="Import" />
      </div>

      {/* Create button */}
      <div className="p-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-400 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-yellow-500">
          <PlusIcon />
          Create
        </button>
      </div>
    </nav>
  );
}
