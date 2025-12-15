import { useRef, useCallback, useEffect } from "react";
import { GRID_SIZE, BASE_CELL_SIZE, BASE_CANVAS_SIZE, COLORS } from "@/lib/constants";
import { getLinePoints } from "@/lib/bresenham";
import type { Tool, Cell } from "@/lib/types";

function createEmptyGrid(): boolean[][] {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(false));
}

interface UseDrawingCanvasOptions {
  tool: Tool;
  isDarkMode: boolean;
}

interface UseDrawingCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  clear: () => void;
}

/**
 * Hook that manages all canvas drawing logic including:
 * - Grid state management
 * - Mouse and touch event handling
 * - Canvas rendering
 * - Line interpolation between points
 */
export function useDrawingCanvas({
  tool,
  isDarkMode,
}: UseDrawingCanvasOptions): UseDrawingCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<boolean[][]>(createEmptyGrid());
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<Cell | null>(null);
  const toolRef = useRef<Tool>(tool);

  // Keep toolRef in sync with tool prop
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const getColors = useCallback(() => {
    const colorScheme = isDarkMode ? COLORS.dark : COLORS.light;
    return {
      bgColor: colorScheme.background,
      fgColor: colorScheme.foreground,
    };
  }, [isDarkMode]);

  // Render the entire grid to canvas
  const renderGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const { bgColor, fgColor } = getColors();

    // Clear with background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, BASE_CANVAS_SIZE, BASE_CANVAS_SIZE);

    // Draw filled cells
    ctx.fillStyle = fgColor;
    const grid = gridRef.current;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col]) {
          ctx.fillRect(
            col * BASE_CELL_SIZE,
            row * BASE_CELL_SIZE,
            BASE_CELL_SIZE,
            BASE_CELL_SIZE
          );
        }
      }
    }
  }, [getColors]);

  // Re-render when dark mode changes
  useEffect(() => {
    renderGrid();
  }, [renderGrid]);

  // Fill cells and update canvas efficiently
  const fillCells = useCallback(
    (cells: Cell[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const { bgColor, fgColor } = getColors();
      const isDraw = toolRef.current === "draw";

      ctx.fillStyle = isDraw ? fgColor : bgColor;

      for (const { row, col } of cells) {
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
          gridRef.current[row][col] = isDraw;
          ctx.fillRect(
            col * BASE_CELL_SIZE,
            row * BASE_CELL_SIZE,
            BASE_CELL_SIZE,
            BASE_CELL_SIZE
          );
        }
      }
    },
    [getColors]
  );

  // Convert client coordinates to grid cell
  const getCellFromCoords = useCallback(
    (clientX: number, clientY: number): Cell | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const col = Math.floor(x / BASE_CELL_SIZE);
      const row = Math.floor(y / BASE_CELL_SIZE);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
      }
      return null;
    },
    []
  );

  // Handle start of drawing (mouse or touch)
  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      isDrawingRef.current = true;
      const cell = getCellFromCoords(clientX, clientY);
      if (cell) {
        lastCellRef.current = cell;
        fillCells([cell]);
      }
    },
    [getCellFromCoords, fillCells]
  );

  // Handle move while drawing (mouse or touch)
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;

      const cell = getCellFromCoords(clientX, clientY);
      if (cell) {
        const last = lastCellRef.current;
        if (last) {
          const points = getLinePoints(last.col, last.row, cell.col, cell.row);
          fillCells(points);
        } else {
          fillCells([cell]);
        }
        lastCellRef.current = cell;
      }
    },
    [getCellFromCoords, fillCells]
  );

  // Handle end of drawing
  const handleEnd = useCallback(() => {
    isDrawingRef.current = false;
    lastCellRef.current = null;
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleStart(touch.clientX, touch.clientY);
      }
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd]
  );

  // Clear the canvas
  const clear = useCallback(() => {
    gridRef.current = createEmptyGrid();
    renderGrid();
  }, [renderGrid]);

  // Set up event listeners
  useEffect(() => {
    renderGrid();

    const canvas = canvasRef.current;

    // Mouse events on document for tracking outside canvas
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);

    // Touch events on canvas with passive: false to allow preventDefault
    if (canvas) {
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
      canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);

      if (canvas) {
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchend", handleTouchEnd);
        canvas.removeEventListener("touchcancel", handleTouchEnd);
      }
    };
  }, [renderGrid, handleMouseMove, handleEnd, handleTouchMove, handleTouchEnd]);

  return {
    canvasRef,
    handleMouseDown,
    handleTouchStart,
    clear,
  };
}
