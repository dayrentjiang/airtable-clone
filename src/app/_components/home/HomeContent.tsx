"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";

// Template card icons
function ResourceIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function SprintIcon() {
  return (
    <svg
      width="20"
      height="20"
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

function ListIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
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
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Template card component
function TemplateCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex cursor-pointer flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm">
      <div className="flex items-center gap-2 text-gray-700">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

// Base card component
function BaseCard({
  name,
  updatedAt,
  onClick,
}: {
  name: string;
  updatedAt: Date;
  onClick: () => void;
}) {
  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "UN";

  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-700 text-sm font-medium text-white">
        {initials}
      </div>
      <div>
        <p className="font-medium text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{formatRelativeTime(updatedAt)}</p>
      </div>
    </div>
  );
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const updated = new Date(date);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Opened just now";
  if (diffMins < 60) return `Opened ${diffMins} minutes ago`;
  if (diffHours < 24) return `Opened ${diffHours} hours ago`;
  if (diffDays < 7) return `Opened ${diffDays} days ago`;
  return `Opened on ${updated.toLocaleDateString()}`;
}

// Group bases by time period
type Base = { id: string; name: string; updatedAt: Date };

function groupBasesByTime(bases: Base[]) {
  const today: Base[] = [];
  const pastWeek: Base[] = [];
  const older: Base[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);

  bases.forEach((base) => {
    const updated = new Date(base.updatedAt);
    if (updated >= todayStart) {
      today.push(base);
    } else if (updated >= weekAgo) {
      pastWeek.push(base);
    } else {
      older.push(base);
    }
  });

  return { today, pastWeek, older };
}

export function HomeContent() {
  const router = useRouter();

  // Ensure user has at least one workspace and base (for new users)
  const ensureDefaultMutation = api.workspace.ensureDefault.useMutation();

  // Fetch all bases for current user
  const { data: bases, isLoading, refetch } = api.base.getAll.useQuery();

  // Check and create default workspace/base on mount
  useEffect(() => {
    if (!isLoading && bases?.length === 0 && !ensureDefaultMutation.isPending) {
      ensureDefaultMutation.mutate(undefined, {
        onSuccess: (result) => {
          if (result.created) {
            // Refresh the bases list
            void refetch();
          }
        },
      });
    }
  }, [isLoading, bases?.length]);

  // Group bases by time
  const grouped = bases
    ? groupBasesByTime(bases)
    : { today: [], pastWeek: [], older: [] };

  const handleBaseClick = (baseId: string) => {
    router.push(`/${baseId}`);
  };

  // Show loading while initial load or auto-creation is in progress
  const isInitializing =
    isLoading || (bases?.length === 0 && ensureDefaultMutation.isPending);

  return (
    <div className="p-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900">Home</h1>

      {/* Opened anytime section */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            Opened anytime
            <ChevronDownIcon />
          </button>

          <div className="flex items-center gap-1">
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <ListIcon />
            </button>
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <GridIcon />
            </button>
          </div>
        </div>

        {/* Loading state - show while initializing or creating defaults */}
        {isInitializing && (
          <div className="mt-6 text-sm text-gray-500">
            {ensureDefaultMutation.isPending
              ? "Setting up your workspace..."
              : "Loading bases..."}
          </div>
        )}

        {/* Only show content when not initializing */}
        {!isInitializing && (
          <>
            {/* Today section */}
            {grouped.today.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Today</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.today.map((base) => (
                    <BaseCard
                      key={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past 7 days section */}
            {grouped.pastWeek.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500">
                  Past 7 days
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.pastWeek.map((base) => (
                    <BaseCard
                      key={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older section */}
            {grouped.older.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500">Older</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.older.map((base) => (
                    <BaseCard
                      key={base.id}
                      name={base.name}
                      updatedAt={base.updatedAt}
                      onClick={() => handleBaseClick(base.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
