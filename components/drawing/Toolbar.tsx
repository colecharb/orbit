import type { Tool } from "@/lib/types";

type ViewMode = "2d" | "3d" | "sketch";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onClear: () => void;
  viewMode: ViewMode;
  onConvertTo3D: () => void;
  onBackTo2D: () => void;
  onToggleTo3D: () => void;
  onView3D: () => void;
  onViewSketch: () => void;
  onCopyToCanvas: () => void;
  isConverting: boolean;
  hasMesh: boolean;
}

export function Toolbar({
  tool,
  onToolChange,
  onClear,
  viewMode,
  onConvertTo3D,
  onBackTo2D,
  onToggleTo3D,
  onView3D,
  onViewSketch,
  onCopyToCanvas,
  isConverting,
  hasMesh,
}: ToolbarProps) {
  const is3DMode = viewMode === "3d" || viewMode === "sketch";

  return (
    <div className="flex flex-col gap-2">
      {/* Top row: 2D/3D toggle */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={onBackTo2D}
          className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
            viewMode === "2d"
              ? "bg-foreground text-background"
              : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
          }`}
        >
          Canvas
        </button>

        <button
          onClick={onToggleTo3D}
          disabled={!hasMesh}
          className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
            is3DMode
              ? "bg-foreground text-background"
              : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Orbit
        </button>
      </div>

      {/* Bottom row: Context-specific tools */}
      <div className="flex gap-2 justify-center">
        {viewMode === "2d" ? (
          <>
            <button
              onClick={() => onToolChange("draw")}
              className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
                tool === "draw"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
              }`}
            >
              Draw
            </button>

            <button
              onClick={() => onToolChange("erase")}
              className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
                tool === "erase"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
              }`}
            >
              Erase
            </button>

            <button
              onClick={onClear}
              className="px-4 py-2 corner-squircle rounded-2xl border border-red-300/50 bg-background text-red-300 hover:bg-red-300/10 transition-colors"
            >
              Clear
            </button>

            <button
              onClick={onConvertTo3D}
              disabled={isConverting}
              className="px-4 py-2 corner-squircle rounded-2xl border border-blue-300/50 bg-background text-blue-300 hover:bg-blue-300/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? "Converting..." : "Convert to 3D"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onView3D}
              disabled={!hasMesh}
              className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
                viewMode === "3d"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Model
            </button>

            <button
              onClick={onViewSketch}
              disabled={!hasMesh}
              className={`px-4 py-2 corner-squircle rounded-2xl border transition-colors ${
                viewMode === "sketch"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground border-foreground/30 hover:bg-foreground/10"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Sketch
            </button>

            {viewMode === "sketch" && (
              <button
                onClick={onCopyToCanvas}
                className="px-4 py-2 corner-squircle rounded-2xl border border-green-300/50 bg-background text-green-300 hover:bg-green-300/10 transition-colors"
              >
                Copy to Canvas
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
