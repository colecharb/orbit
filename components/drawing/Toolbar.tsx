import type { Tool } from "@/lib/types";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onClear: () => void;
}

export function Toolbar({ tool, onToolChange, onClear }: ToolbarProps) {
  return (
    <div className="flex gap-2">
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
        className="px-4 py-2 corner-squircle rounded-2xl border border-foreground/30 bg-background text-foreground hover:bg-foreground/10 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
