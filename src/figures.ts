export type Cell = { x: number; y: number };

export const patterns = {
	// "block" : relative coords (top-left corner is reference)
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
        blackCells: [
			
        ] as Cell[],
    },
};

// Convenience: apply a pattern to a Uint8Array grid (mutates grid).
// grid must have length === cols * rows. Values: 0 = white, 1 = black.
// offsetX/offsetY are the target position (top-left reference on the grid).
// If clearGrid=true the function will clear the grid first, otherwise it overlays.
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
