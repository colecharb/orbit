export const GRID_SIZE = 128;
export const BASE_CELL_SIZE = 4;
export const BASE_CANVAS_SIZE = GRID_SIZE * BASE_CELL_SIZE;

export const COLORS = {
  light: {
    background: "#ffffff",
    foreground: "#171717",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#ededed",
  },
} as const;
