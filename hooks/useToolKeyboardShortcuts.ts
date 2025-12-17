import { useEffect } from "react";
import type { Tool } from "@/lib/types";

export function useToolKeyboardShortcuts(setTool: (tool: Tool) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "d") {
        setTool("draw");
      } else if (e.key === "e") {
        setTool("erase");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);
}
