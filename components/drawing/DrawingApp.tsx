"use client";

import { useState } from "react";
import {
  useDarkMode,
  useResponsiveCanvasSize,
  useLockScroll,
  useDrawingCanvas,
} from "@/hooks";
import type { Tool } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { DrawingCanvas } from "./DrawingCanvas";
import { GRID_SIZE } from "@/lib/constants";

export function DrawingApp() {
  const [tool, setTool] = useState<Tool>("draw");
  const isDarkMode = useDarkMode();
  const canvasDisplaySize = useResponsiveCanvasSize();

  useLockScroll();

  const { canvasRef, handleMouseDown, handleTouchStart, clear } =
    useDrawingCanvas({
      tool,
      isDarkMode,
    });

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 gap-4 overflow-hidden touch-none">
      <h1 className="text-2xl font-bold">Orbit</h1>
      <h2>{`${GRID_SIZE} × ${GRID_SIZE} Pixels`}</h2>

      <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />

      <DrawingCanvas
        canvasRef={canvasRef}
        displaySize={canvasDisplaySize}
        tool={tool}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />

      <p className="text-sm text-foreground/60">
        Click and drag to {tool}. Current tool: <strong>{tool}</strong>
      </p>
    </div>
  );
}
