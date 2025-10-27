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
	gosperglidergun: {
        blackCells: [
			// first block
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
