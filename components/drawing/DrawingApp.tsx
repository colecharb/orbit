"use client";

import { useState, useEffect, useRef } from "react";
import {
  useDarkMode,
  useResponsiveCanvasSize,
  useLockScroll,
  useDrawingCanvas,
  useTouchDevice,
  useToolKeyboardShortcuts,
  useMeshConversion,
} from "@/hooks";
import type { Tool } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { DrawingCanvas } from "./DrawingCanvas";
import { UnifiedMeshViewer } from "./UnifiedMeshViewer";
import { GRID_SIZE } from "@/lib/constants";

type ViewMode = "2d" | "3d" | "sketch";

export function DrawingApp() {
  const [tool, setTool] = useState<Tool>("draw");
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const hasAutoSwitchedRef = useRef(false);
  const last3DModeRef = useRef<"3d" | "sketch">("3d");
  const sketchViewerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isTouchDevice = useTouchDevice();
  const isDarkMode = useDarkMode();
  const canvasDisplaySize = useResponsiveCanvasSize();

  useLockScroll();
  useToolKeyboardShortcuts(setTool);

  const { canvasRef, handleMouseDown, handleTouchStart, clear } =
    useDrawingCanvas({
      tool,
      isDarkMode,
    });

  const {
    status: conversionStatus,
    progress,
    meshUrl,
    error: conversionError,
    convertSketch,
    reset: resetConversion,
  } = useMeshConversion();

  const handleConvertTo3D = async () => {
    if (!canvasRef.current) return;

    try {
      await convertSketch(canvasRef.current, "cars");
      // Mode will switch to 3d automatically when conversion completes
    } catch (err) {
      console.error("Conversion failed:", err);
    }
  };

  const handleBackTo2D = () => {
    setViewMode("2d");
  };

  const handleToggleTo3D = () => {
    // Return to the last 3D view mode that was active
    setViewMode(last3DModeRef.current);
  };

  const handleView3D = () => {
    last3DModeRef.current = "3d";
    setViewMode("3d");
  };

  const handleViewSketch = () => {
    last3DModeRef.current = "sketch";
    setViewMode("sketch");
  };

  const handleCopyToCanvas = () => {
    if (!canvasRef.current || !sketchViewerCanvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Fill with background color first
    const bgColor = isDarkMode ? "#0a0a0a" : "#ffffff";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw the WebGL canvas (128x128) onto the 2D canvas (512x512)
    // This will scale it up 4x with pixelated rendering
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sketchViewerCanvasRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Switch back to canvas view to see the result
    setViewMode("2d");
  };

  // Reset auto-switch flag when a new conversion starts
  useEffect(() => {
    if (conversionStatus === "converting") {
      hasAutoSwitchedRef.current = false;
    }
  }, [conversionStatus]);

  // Automatically switch to 3D when mesh is ready (only once per conversion)
  useEffect(() => {
    if (
      conversionStatus === "completed" &&
      meshUrl &&
      viewMode === "2d" &&
      !hasAutoSwitchedRef.current
    ) {
      last3DModeRef.current = "3d";
      setViewMode("3d");
      hasAutoSwitchedRef.current = true;
    }
  }, [conversionStatus, meshUrl, viewMode]);

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 gap-4 overflow-hidden touch-none">
      <h1 className="text-2xl font-bold">Orbit</h1>
      <h2>
        {viewMode === "2d"
          ? `${GRID_SIZE} × ${GRID_SIZE} Pixels`
          : viewMode === "3d"
            ? "3D Model Viewer"
            : "3D Sketch View"}
      </h2>

      <div className="relative w-full max-w-2xl aspect-square">
        <div
          className="absolute inset-0"
          style={{
            zIndex: viewMode === "2d" ? 10 : 0,
            pointerEvents: viewMode === "2d" ? "auto" : "none",
          }}
        >
          <DrawingCanvas
            canvasRef={canvasRef}
            displaySize={canvasDisplaySize}
            tool={tool}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          />
        </div>

        {meshUrl && (
          <>
            <div
              className="bg-background absolute inset-0"
              style={{
                zIndex: viewMode === "3d" ? 10 : 0,
                pointerEvents: viewMode === "3d" ? "auto" : "none",
              }}
            >
              <UnifiedMeshViewer
                meshUrl={meshUrl}
                mode="full"
                displaySize={canvasDisplaySize}
                isDarkMode={isDarkMode}
              />
            </div>
            <div
              className="bg-background absolute inset-0"
              style={{
                zIndex: viewMode === "sketch" ? 10 : 0,
                pointerEvents: viewMode === "sketch" ? "auto" : "none",
              }}
            >
              <UnifiedMeshViewer
                meshUrl={meshUrl}
                mode="sketch"
                displaySize={canvasDisplaySize}
                isDarkMode={isDarkMode}
                canvasRef={sketchViewerCanvasRef}
              />
            </div>
          </>
        )}

        {conversionStatus === "converting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center text-white">
              <div className="mb-2">Converting to 3D...</div>
              <div className="text-sm">{progress}% complete</div>
            </div>
          </div>
        )}

        {conversionError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center text-red-300">
              <div className="mb-2">Conversion failed</div>
              <div className="text-sm">{conversionError}</div>
              <button
                onClick={resetConversion}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-foreground/60">
        {viewMode === "2d"
          ? `${isTouchDevice ? "Press" : "Click"} and drag to ${tool}.`
          : "Drag to rotate, scroll to zoom, right-click to pan"}
      </p>

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        onClear={clear}
        viewMode={viewMode}
        onConvertTo3D={handleConvertTo3D}
        onBackTo2D={handleBackTo2D}
        onToggleTo3D={handleToggleTo3D}
        onView3D={handleView3D}
        onViewSketch={handleViewSketch}
        onCopyToCanvas={handleCopyToCanvas}
        isConverting={conversionStatus === "converting"}
        hasMesh={!!meshUrl}
      />
    </div>
  );
}
