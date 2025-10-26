export type Cell = { x: number; y: number };

export const patterns = {
	// "block" : all white except the four cells at (100,100),(100,101),(101,100),(101,101)
	block: {
		blackCells: [
			{ x: 6, y: 5 },
			{ x: 6, y: 6 },
			{ x: 7, y: 5 },
			{ x: 7, y: 6 },

		] as Cell[],
	},
    glider: {
        blackCells: [
            { x: 6, y: 5 },
            { x: 7, y: 5 },
            { x: 8, y: 5 },
            { x: 8, y: 4 },
            { x: 7, y: 3 },
        ] as Cell[],
    },
};

// Convenience: apply a pattern to a Uint8Array grid (mutates grid).
// grid must have length === cols * rows. Values: 0 = white, 1 = black.
export function applyPatternToGrid(grid: Uint8Array, cols: number, rows: number, patternName: keyof typeof patterns) {
	if (!grid || grid.length !== cols * rows) return;
	const pat = patterns[patternName];
	if (!pat) return;
	// clear grid
	grid.fill(0);
	for (const cell of pat.blackCells) {
		const { x, y } = cell;
		if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
		grid[y * cols + x] = 1;
	}
}
