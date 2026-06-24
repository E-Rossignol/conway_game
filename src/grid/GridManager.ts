import Square from "../models/Square";

/**
 * GridManager maintains a grid of `Square` objects and provides helpers
 * to operate on that logical grid. It supports resizing, iterating, and
 * several static utilities that operate on a Uint8Array-backed grid.
 */
export default class GridManager {
  cellCount: number;
  cols: number;
  rows: number;
  gridMin: number;
  squares: Map<string, Square>;

  /**
   * Create a GridManager instance.
   * @param cellCount Logical cell count used to compute gridMin
   * @param cols Number of columns
   * @param rows Number of rows
   */
  constructor(cellCount = 100, cols = 100, rows = 100) {
    this.cellCount = 0;
    this.cols = 0;
    this.rows = 0;
    this.gridMin = 0;
    this.squares = new Map();
    this.resize(cellCount, cols, rows);
  }

  /**
   * Resize and reinitialize the grid.
   */
  resize(cellCount = this.cellCount, cols = this.cols, rows = this.rows) {
    this.cellCount = cellCount;
    this.cols = cols;
    this.rows = rows;
    this.gridMin = -Math.floor(this.cellCount / 2);
    this.squares = new Map();
    this._init();
  }

  /**
   * Alias used by UI/controller code to set viewport size.
   */
  setViewport(cols: number, rows: number) {
    this.resize(this.cellCount, cols, rows);
  }

  private _init() {
    this.squares.clear();
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const gx = this.gridMin + col;
        const gy = this.gridMin + row;
        const s = new Square(gx, gy, 0);
        this.squares.set(s.key(), s);
      }
    }
  }

  getSquare(gx: number, gy: number): Square | undefined {
    return this.squares.get(`${gx},${gy}`);
  }

  toggleAt(gx: number, gy: number) {
    const sq = this.getSquare(gx, gy);
    if (sq) sq.toggle();
  }

  forEach(fn: (sq: Square) => void) {
    for (const sq of this.squares.values()) fn(sq);
  }

  resetAll() {
    for (const sq of this.squares.values()) sq.setColor(0);
  }

  getBlackKeys(): string[] {
    const out: string[] = [];
    for (const sq of this.squares.values()) {
      if (sq.isBlack()) out.push(sq.key());
    }
    return out;
  }

  /**
   * Return coordinates of black cells from a Uint8Array-backed grid.
   * @param grid Buffer of length cols*rows
   */
  static getBlackKeysOnGrid(grid: Uint8Array, cols: number, rows: number): string[] {
    const blackKeys: string[] = [];
    if (!grid || grid.length !== cols * rows) return blackKeys;

    for (let r = 0; r < rows; r++) {
      const base = r * cols;
      for (let c = 0; c < cols; c++) {
        if (grid[base + c]) blackKeys.push(`${c},${r}`);
      }
    }
    console.log("Black keys:", blackKeys);
    return blackKeys;
  }

  /**
   * Generate random soup inside a bounded region. Returns a function that
   * fills the provided grid and returns the coordinates that were set to 1.
   */
  static generateSoup(): (grid: Uint8Array, cols: number, rows: number) => string[] {
    return (grid: Uint8Array, cols: number, rows: number) => {
      const out: string[] = [];
      if (!grid || grid.length !== cols * rows) return out;

      const startX = 10;
      const startY = 10;
      const endXExclusive = Math.min(60, cols);
      const endYExclusive = Math.min(60, rows);

      if (startX >= endXExclusive || startY >= endYExclusive) return out;

      for (let y = startY; y < endYExclusive; y++) {
        const base = y * cols;
        for (let x = startX; x < endXExclusive; x++) {
          const idx = base + x;
          grid[idx] = Math.random() < 0.5 ? 1 : 0;
          if (grid[idx]) out.push(`${x},${y}`);
        }
      }

      return out;
    };
  }

  /**
   * Run a simple toggle-based algorithm on a Uint8Array grid.
   */
  static simpleAlgoOnGrid(grid: Uint8Array, cols: number, rows: number) {
    if (!grid || grid.length !== cols * rows) return;

    const blackKeys = new Set<string>();
    for (let r = 0; r < rows; r++) {
      const base = r * cols;
      for (let c = 0; c < cols; c++) {
        if (grid[base + c]) blackKeys.add(`${c},${r}`);
      }
    }
    if (blackKeys.size === 0) return;

    const toggleCounts = new Map<string, number>();
    const neighbors = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];

    for (const key of blackKeys) {
      const [gxStr, gyStr] = key.split(",");
      const gx = Number(gxStr);
      const gy = Number(gyStr);
      for (const [dx, dy] of neighbors) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const nKey = `${nx},${ny}`;
        if (blackKeys.has(nKey)) continue;
        toggleCounts.set(nKey, (toggleCounts.get(nKey) || 0) + 1);
      }
    }

    for (const key of blackKeys) {
      const [cStr, rStr] = key.split(",");
      const idx = Number(rStr) * cols + Number(cStr);
      grid[idx] = 0;
    }

    for (const [nKey, count] of toggleCounts.entries()) {
      if ((count & 1) === 1) {
        const [cxStr, ryStr] = nKey.split(",");
        const idx = Number(ryStr) * cols + Number(cxStr);
        grid[idx] = grid[idx] ? 0 : 1;
      }
    }
  }

  /**
   * Run one Conway Game of Life step on a Uint8Array grid (in-place).
   */
  static conwayStepOnGrid(grid: Uint8Array, cols: number, rows: number) {
    if (!grid || grid.length !== cols * rows) return;

    const next = new Uint8Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      const rowBase = r * cols;
      for (let c = 0; c < cols; c++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = c + dx;
            const ny = r + dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            if (grid[ny * cols + nx]) neighbors++;
          }
        }

        const idx = rowBase + c;
        const alive = grid[idx] ? 1 : 0;
        if (alive) {
          next[idx] = neighbors === 2 || neighbors === 3 ? 1 : 0;
        } else {
          next[idx] = neighbors === 3 ? 1 : 0;
        }
      }
    }

    grid.set(next);
  }
}
