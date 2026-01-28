"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateBaseModal } from "../ui/CreateBaseModal";
import { api } from "~/trpc/react";
import { Home, Star, Users, Grid3x3, Plus, ChevronRight } from "lucide-react";

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
        className={`group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm ${
          active ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
        }`}
        onClick={onToggle}
      >
        {expandable && (
          <span className="text-gray-400">
            <ChevronRight
              size={14}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
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
            className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200"
          >
            <Plus size={14} />
          </button>
        )}
        {expandable && !onAdd && (
          <span className="text-gray-400 opacity-0 group-hover:opacity-100">
            <ChevronRight size={14} />
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const router = useRouter();

  const utils = api.useUtils();

  // Get all workspaces to find a default one
  const { data: workspaces } = api.workspace.getAll.useQuery();
  const defaultWorkspaceId = workspaces?.[0]?.id ?? "default";

  const createBaseMutation = api.base.create.useMutation({
    onSuccess: (newBase) => {
      // Close modal
      setIsCreateModalOpen(false);

      // Navigate to the new base
      router.push(`/${newBase.id}`);

      // Invalidate bases query to refresh the list
      void utils.base.getAll.invalidate();
    },
  });

  const handleCreateBlankBase = () => {
    createBaseMutation.mutate({
      workspaceId: defaultWorkspaceId,
      name: "Untitled Base",
    });
  };

  return (
    <nav className="flex h-full w-76 flex-col border-r border-gray-200 bg-white">
      {/* Main nav items */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Home */}
        <NavItem icon={<Home size={18} />} label="Home" active />

        {/* Starred */}
        <NavItem
          icon={<Star size={18} />}
          label="Starred"
          expandable
          expanded={starredExpanded}
          onToggle={() => setStarredExpanded(!starredExpanded)}
        >
          <div className="cursor-pointer rounded py-1 pl-2 text-sm text-gray-600 hover:bg-gray-100">
            My First Workspace
          </div>
        </NavItem>

        {/* Shared */}
        <NavItem icon={<Users size={18} />} label="Shared" />

        {/* Workspaces */}
        <NavItem
          icon={<Grid3x3 size={18} />}
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
      </div>

      {/* Create button */}
      <div className="p-3">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Create
        </button>
      </div>

      {/* Create Base Modal */}
      <CreateBaseModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateBlankBase={handleCreateBlankBase}
      />
    </nav>
  );
}
