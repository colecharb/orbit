export type Tool = "draw" | "erase";

export interface Cell {
  row: number;
  col: number;
}

export interface DrawingState {
  grid: boolean[][];
  tool: Tool;
}
