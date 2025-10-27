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
			// NOTE: these were previously absolute; if you want them relative you should
			// normalize them to a top-left reference. For now keep them as a larger template
			// relative to a chosen origin (example values retained from previous).
			{ x: 10, y: 8 },
			{ x: 11, y: 8 },
			{ x: 10, y: 9 },
			{ x: 11, y: 9 },
			// first middle unity
			{ x: 20, y: 8 },
			{ x: 20, y: 9 },
			{ x: 20, y: 10 },
			{ x: 21, y: 11 },
			{ x: 22, y: 12 },
			{ x: 23, y: 12 },
			{ x: 21, y: 7 },
			{ x: 22, y: 6 },
			{ x: 23, y: 6 },
			{ x: 24, y: 9 },
			{ x: 25, y: 11 },
			{ x: 25, y: 7 },
			{ x: 26, y: 8 },
			{ x: 26, y: 9 },
			{ x: 26, y: 10 },
			{ x: 27, y: 9 },
			// second middle unity
			{ x: 30, y: 8 },
			{ x: 30, y: 7 },
			{ x: 30, y: 6 },
			{ x: 31, y: 8 },
			{ x: 31, y: 7 },
			{ x: 31, y: 6 },
			{ x: 32, y: 9 },
			{ x: 32, y: 5 },
			{ x: 30, y: 8 },
			{ x: 34, y: 4 },
			{ x: 34, y: 5 },
			{ x: 34, y: 9 },
			{ x: 34, y: 10 },
			// last block
			{ x: 44, y: 6 },
			{ x: 45, y: 6 },
			{ x: 44, y: 7 },
			{ x: 45, y: 7 },
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
