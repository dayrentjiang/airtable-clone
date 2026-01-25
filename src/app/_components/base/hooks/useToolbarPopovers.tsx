"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type PopoverType = "filter" | "sort" | "hideFields" | null;

interface ToolbarPopoversContextValue {
  openPopover: PopoverType;
  setOpenPopover: (popover: PopoverType) => void;
  isPopoverOpen: (popover: PopoverType) => boolean;
  closeAllPopovers: () => void;
}

const ToolbarPopoversContext =
  createContext<ToolbarPopoversContextValue | null>(null);

interface ToolbarPopoversProviderProps {
  children: ReactNode;
}

export function ToolbarPopoversProvider({
  children,
}: ToolbarPopoversProviderProps) {
  const [openPopover, setOpenPopover] = useState<PopoverType>(null);

  const isPopoverOpen = useCallback(
    (popover: PopoverType) => {
      return openPopover === popover;
    },
    [openPopover],
  );

  const closeAllPopovers = useCallback(() => {
    setOpenPopover(null);
  }, []);

  return (
    <ToolbarPopoversContext.Provider
      value={{
        openPopover,
        setOpenPopover,
        isPopoverOpen,
        closeAllPopovers,
      }}
    >
      {children}
    </ToolbarPopoversContext.Provider>
  );
}

export function useToolbarPopovers() {
  const context = useContext(ToolbarPopoversContext);
  if (!context) {
    throw new Error(
      "useToolbarPopovers must be used within ToolbarPopoversProvider",
    );
  }
  return context;
}
