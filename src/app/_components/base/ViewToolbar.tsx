"use client";

function HamburgerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function ColorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" />
    </svg>
  );
}

function RowHeightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function ViewToolbar() {
  return (
    <div className="flex h-11 items-center justify-between border-b border-gray-200 bg-white px-3">
      {/* Left: Hamburger + View dropdown */}
      <div className="flex items-center gap-1">
        <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
          <HamburgerIcon />
        </button>

        <button className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100">
          <GridIcon />
          <span>Grid view</span>
          <ChevronDownIcon />
        </button>
      </div>

      {/* Right: Toolbar actions */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={<EyeOffIcon />} label="Hide fields" />
        <ToolbarButton icon={<FilterIcon />} label="Filter" />
        <ToolbarButton icon={<GroupIcon />} label="Group" />
        <ToolbarButton icon={<SortIcon />} label="Sort" />
        <ToolbarButton icon={<ColorIcon />} label="Color" />

        <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
          <RowHeightIcon />
        </button>

        <ToolbarButton icon={<ShareIcon />} label="Share and sync" />

        <button className="rounded p-1.5 text-gray-600 hover:bg-gray-100">
          <SearchIcon />
        </button>
      </div>
    </div>
  );
}
