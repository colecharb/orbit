"use client";

import { BASE_CANVAS_SIZE } from "@/lib/constants";
import type { Tool } from "@/lib/types";

interface DrawingCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  displaySize: number;
  tool: Tool;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}

export function DrawingCanvas({
  canvasRef,
  displaySize,
  tool,
  onMouseDown,
  onTouchStart,
}: DrawingCanvasProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={BASE_CANVAS_SIZE}
        height={BASE_CANVAS_SIZE}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="border border-foreground/30 select-none touch-none"
        style={{
          width: displaySize,
          height: displaySize,
          cursor: tool === "draw" ? "crosshair" : "cell",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
