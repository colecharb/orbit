import { useState, useEffect } from "react";
import { BASE_CANVAS_SIZE } from "@/lib/constants";

const PADDING = 32; // p-4 = 16px on each side
const VERTICAL_SPACE = 200; // Room for controls and text

/**
 * Hook that calculates the optimal display size for the canvas
 * based on the current viewport dimensions.
 */
export function useResponsiveCanvasSize(): number {
  const [canvasDisplaySize, setCanvasDisplaySize] = useState(BASE_CANVAS_SIZE);

  useEffect(() => {
    const updateCanvasSize = () => {
      const maxWidth = window.innerWidth - PADDING;
      const maxHeight = window.innerHeight - VERTICAL_SPACE;
      const maxSize = Math.min(maxWidth, maxHeight, BASE_CANVAS_SIZE);
      setCanvasDisplaySize(Math.floor(maxSize));
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  return canvasDisplaySize;
}
