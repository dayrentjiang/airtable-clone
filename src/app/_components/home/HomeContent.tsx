"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";
import {
  Grid2X2,
  CheckSquare,
  LayoutGrid,
  List,
  Grid3x3,
  ChevronDown,
} from "lucide-react";
import { BaseCard } from "./BaseCard";

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
    <div className="px-12 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900">Home</h1>

      {/* Start building section */}
      <section className="mt-4">
        <h2 className="text-xl font-semibold text-gray-900">Start building</h2>
        <p className="mt-1 text-sm text-gray-600">
          Create apps instantly with AI
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Grid2X2,
              title: "Resource Planner",
              description:
                "Allocate engineers to projects and balance team workloads.",
            },
            {
              icon: CheckSquare,
              title: "Bug Tracker",
              description: "Log, prioritize, and resolve bugs across projects.",
            },
            {
              icon: LayoutGrid,
              title: "Sprint Tracker",
              description:
                "Plan and manage agile sprints with tasks and progress tracking.",
            },
          ].map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.title}
                className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-white p-4.5 text-left shadow-sm transition-all hover:cursor-pointer hover:border-gray-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {template.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-600">{template.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Opened anytime section */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            Opened anytime
            <ChevronDown size={16} />
          </button>

          <div className="flex items-center gap-1">
            <button className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <List size={18} />
            </button>
            <button className="rounded-2xl bg-gray-200/80 p-1.5 text-gray-600">
              <Grid3x3 size={18} />
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
            {/* Empty state - show when no bases exist */}
            {grouped.today.length === 0 &&
              grouped.pastWeek.length === 0 &&
              grouped.older.length === 0 && (
                <div className="mt-32 flex items-center justify-center">
                  <p className="text-sm text-gray-500">
                    All records are filtered
                  </p>
                </div>
              )}

            {/* Today section */}
            {grouped.today.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Today</h3>
                <div className="mt-3 grid min-h-24 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.today.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
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
                <div className="mt-3 grid min-h-24 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.pastWeek.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
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
                <div className="mt-3 grid min-h-24 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {grouped.older.map((base) => (
                    <BaseCard
                      key={base.id}
                      baseId={base.id}
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
