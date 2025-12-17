"use client";

import { useState } from "react";
import {
  useDarkMode,
  useResponsiveCanvasSize,
  useLockScroll,
  useDrawingCanvas,
  useTouchDevice,
} from "@/hooks";
import type { Tool } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { DrawingCanvas } from "./DrawingCanvas";
import { GRID_SIZE } from "@/lib/constants";

export function DrawingApp() {
  const [tool, setTool] = useState<Tool>("draw");
  const isTouchDevice = useTouchDevice();
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

      <DrawingCanvas
        canvasRef={canvasRef}
        displaySize={canvasDisplaySize}
        tool={tool}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />

      <p className="text-sm text-foreground/60">
        {isTouchDevice ? "Press" : "Click"} and drag to {tool}.
      </p>

      <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />
    </div>
  );
}
