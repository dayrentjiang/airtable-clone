import { useContext } from "react";
import { ViewConfigContext } from "./ViewConfigContext";
import type { ViewConfigContextValue } from "./types";

export function useViewConfig(): ViewConfigContextValue {
  const context = useContext(ViewConfigContext);

  if (!context) {
    throw new Error("useViewConfig must be used within a ViewConfigProvider");
  }

  return context;
}
