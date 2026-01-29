"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateBaseModal } from "../ui/CreateBaseModal";
import { api } from "~/trpc/react";
import {
  Home,
  Star,
  Grid3x3,
  Plus,
  ChevronRight,
  LayoutGrid,
  ShoppingBag,
  Upload,
  Share2,
} from "lucide-react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
  children?: React.ReactNode;
  textSize?: "sm" | "xs";
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
  textSize = "sm",
}: NavItemProps) {
  const textSizeClass = textSize === "xs" ? "text-xs" : "text-sm";
  const paddingClass = textSize === "xs" ? "py-2" : "py-3";

  return (
    <div>
      <div
        className={`group flex cursor-pointer items-center gap-2 rounded-xs px-3 ${paddingClass} ${textSizeClass} ${
          active ? "bg-gray-100 font-medium" : "hover:bg-gray-100"
        }`}
        onClick={onToggle}
      >
        <span className="text-gray-600">{icon}</span>
        <span className={`flex-1 ${textSizeClass} font-semibold text-gray-700`}>
          {label}
        </span>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="rounded p-0.5 hover:bg-gray-200"
          >
            <Plus size={16} />
          </button>
        )}
        {expandable && (
          <span className="text-gray-400">
            <ChevronRight
              size={14}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
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
      <div className="flex-1 overflow-y-auto px-3 py-3">
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
          <div className="flex cursor-pointer items-center gap-2 rounded py-1.5 text-xs text-gray-600 hover:bg-gray-100">
            <Grid3x3 size={16} className="text-gray-400" />
            <span>My First Workspace</span>
          </div>
        </NavItem>

        {/* Shared */}
        <NavItem icon={<Share2 size={18} />} label="Shared" />

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
        </NavItem>
      </div>

      {/* Bottom section - Templates, Marketplace, Import */}
      <div className="border-t border-gray-200 px-2 py-2">
        <NavItem
          icon={<LayoutGrid size={16} />}
          label="Templates and apps"
          textSize="xs"
        />
        <NavItem
          icon={<ShoppingBag size={16} />}
          label="Marketplace"
          textSize="xs"
        />
        <NavItem icon={<Upload size={16} />} label="Import" textSize="xs" />
      </div>

      {/* Create button */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex w-full items-center justify-center gap-1 rounded-md bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:cursor-pointer"
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
