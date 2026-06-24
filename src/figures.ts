export type Cell = { x: number; y: number };

export const patterns = {
	block: {
		blackCells: [
			{ x: 0, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
		] as Cell[],
	},
	glider: {
		blackCells: [
			{ x: 0, y: 1 },
			{ x: 2, y: 0 },
			{ x: 2, y: 1 },
			{ x: 2, y: 2 },
			{ x: 1, y: 2 },
		] as Cell[],
	},
	gosperglidergun: {
		blackCells: [] as Cell[],
	},
	pentadecathlon: {
		blackCells: [
			{ x: 2, y: 0 },
			{ x: 7, y: 0 },
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 3, y: 1 },
			{ x: 4, y: 1 },
			{ x: 5, y: 1 },
			{ x: 6, y: 1 },
			{ x: 8, y: 1 },
			{ x: 9, y: 1 },
			{ x: 2, y: 2 },
			{ x: 7, y: 2 },
		] as Cell[],
	},
	queenbeeshuttle: {
		blackCells: [
			{ x: 9, y: 0 },
			{ x: 7, y: 1 },
			{ x: 9, y: 1 },
			{ x: 6, y: 2 },
			{ x: 8, y: 2 },
			{ x: 0, y: 3 },
			{ x: 1, y: 3 },
			{ x: 5, y: 3 },
			{ x: 8, y: 3 },
			{ x: 0, y: 4 },
			{ x: 1, y: 4 },
			{ x: 6, y: 4 },
			{ x: 8, y: 4 },
			{ x: 7, y: 5 },
			{ x: 9, y: 5 },
			{ x: 18, y: 5 },
			{ x: 19, y: 5 },
			{ x: 9, y: 6 },
			{ x: 18, y: 6 },
			{ x: 20, y: 6 },
			{ x: 20, y: 7 },
			{ x: 20, y: 8 },
			{ x: 21, y: 8 },
		] as Cell[],
	},
};

/**
 * Apply a named pattern to a Uint8Array-backed grid.
 * The function mutates `grid` in-place.
 * @param grid Buffer representing the grid (length must be cols*rows)
 * @param cols Number of columns in the target grid
 * @param rows Number of rows in the target grid
 * @param patternName Pattern key from `patterns`
 * @param offsetX Target X (column) where pattern's reference will be placed
 * @param offsetY Target Y (row) where pattern's reference will be placed
 * @param clearGrid If true the grid will be cleared before applying the pattern
 */
export function applyPatternToGrid(
	grid: Uint8Array,
	cols: number,
	rows: number,
	patternName: keyof typeof patterns,
	offsetX = 0,
	offsetY = 0,
	clearGrid = true
) {
	if (!grid || grid.length !== cols * rows) return;
	const pat = patterns[patternName];
	if (!pat) return;
	if (clearGrid) grid.fill(0);
	for (const cell of pat.blackCells) {
		const { x, y } = cell;
		const gx = offsetX + x;
		const gy = offsetY + y;
		if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue;
		grid[gy * cols + gx] = 1;
	}
}
