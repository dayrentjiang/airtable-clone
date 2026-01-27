"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Settings } from "lucide-react";
import { api } from "~/trpc/react";
import type { BaseSideNavProps } from "./BaseSideNav/types";
import { CreateViewDropdown } from "./BaseSideNav/CreateViewDropdown";
import { CreateViewModal } from "./BaseSideNav/CreateViewModal";
import { ViewList } from "./BaseSideNav/ViewList";

export function BaseSideNav({
  tableId,
  selectedViewId,
  onViewSelect,
}: BaseSideNavProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingViewType, setPendingViewType] = useState<
    "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM" | null
  >(null);
  const [viewName, setViewName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch views for the current table
  const { data: views, isLoading } = api.view.getByTableId.useQuery(
    { tableId: tableId! },
    {
      enabled: !!tableId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      gcTime: 0,
    },
  );

  // Create view mutation
  const createView = api.view.create.useMutation({
    onSuccess: (newView) => {
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      onViewSelect(newView.id);
      setIsDropdownOpen(false);
      setIsModalOpen(false);
      setPendingViewType(null);
      setViewName("");
    },
  });

  // Rename view mutation with optimistic update
  const renameView = api.view.rename.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await utils.view.getByTableId.cancel({ tableId: tableId! });
      await utils.view.getById.cancel({ id: newData.id });

      // Snapshot the previous values
      const previousViews = utils.view.getByTableId.getData({
        tableId: tableId!,
      });
      const previousView = utils.view.getById.getData({ id: newData.id });

      // Optimistically update the view list cache
      if (previousViews) {
        utils.view.getByTableId.setData({ tableId: tableId! }, (old) =>
          old?.map((view) =>
            view.id === newData.id ? { ...view, name: newData.name } : view,
          ),
        );
      }

      // Optimistically update the individual view cache (for toolbar)
      if (previousView) {
        utils.view.getById.setData(
          { id: newData.id },
          {
            ...previousView,
            name: newData.name,
          },
        );
      }

      // Return a context object with the snapshotted values
      return { previousViews, previousView };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousViews) {
        utils.view.getByTableId.setData(
          { tableId: tableId! },
          context.previousViews,
        );
      }
      if (context?.previousView) {
        utils.view.getById.setData({ id: newData.id }, context.previousView);
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success to ensure data is in sync
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      void utils.view.getById.invalidate({ id: variables.id });
    },
  });

  // Delete view mutation
  const deleteView = api.view.delete.useMutation({
    onSuccess: (_, variables) => {
      void utils.view.getByTableId.invalidate({ tableId: tableId! });
      // If deleted view was selected, select the first available view
      if (variables.id === selectedViewId && views && views.length > 1) {
        const remainingView = views.find((v) => v.id !== variables.id);
        if (remainingView) {
          onViewSelect(remainingView.id);
        }
      }
    },
  });

  const handleViewTypeClick = (
    type: "GRID" | "CALENDAR" | "KANBAN" | "GALLERY" | "FORM",
  ) => {
    if (!tableId) return;

    // Generate a default name based on existing views
    const existingCount = views?.filter((v) => v.type === type).length ?? 0;
    const defaultName =
      existingCount === 0
        ? type.charAt(0) + type.slice(1).toLowerCase()
        : `${type.charAt(0) + type.slice(1).toLowerCase()} ${existingCount + 1}`;

    setViewName(defaultName);
    setPendingViewType(type);
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCreateView = () => {
    if (!tableId || !pendingViewType || !viewName.trim()) return;

    createView.mutate({
      tableId,
      name: viewName.trim(),
      type: pendingViewType,
    });
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setPendingViewType(null);
    setViewName("");
  };

  const handleViewRename = (viewId: string, newName: string) => {
    renameView.mutate({ id: viewId, name: newName });
  };

  const handleViewDelete = (viewId: string) => {
    deleteView.mutate({ id: viewId });
  };

  return (
    <aside className="flex w-70 flex-col border-r border-gray-200 bg-gray-50/50">
      {/* Top section */}
      <div className="flex-1 p-3">
        {/* Create new */}
        <CreateViewDropdown
          isOpen={isDropdownOpen}
          onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
          onViewTypeSelect={handleViewTypeClick}
          dropdownRef={dropdownRef}
        />

        {/* Find a view */}
        <div className="mt-2 flex items-center justify-between">
          <button className="flex items-center gap-2 rounded px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100">
            <Search className="h-3 w-3" />
            <span>Find a view</span>
          </button>
          <button className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Views list */}
        <div className="mt-3 space-y-0">
          <ViewList
            views={views}
            isLoading={isLoading}
            selectedViewId={selectedViewId}
            onViewSelect={onViewSelect}
            onViewRename={handleViewRename}
            onViewDelete={handleViewDelete}
          />
        </div>
      </div>

      {/* Create View Modal */}
      {isModalOpen && (
        <CreateViewModal
          viewName={viewName}
          onViewNameChange={setViewName}
          onCancel={handleCancelModal}
          onCreate={handleCreateView}
          isCreating={createView.isPending}
        />
      )}
    </aside>
  );
}
