import Square from "../models/Square";

export default class GridManager {
  cellCount: number;
  cols: number;
  rows: number;
  gridMin: number;
  squares: Map<string, Square>;

  constructor(cellCount = 100, cols = 100, rows = 100) {
    // déléguer l'initialisation à resize pour pouvoir réutiliser plus tard
    this.cellCount = 0;
    this.cols = 0;
    this.rows = 0;
    this.gridMin = 0;
    this.squares = new Map();
    this.resize(cellCount, cols, rows);
  }

  // redimensionne / réinitialise la grille (cols x rows)
  resize(cellCount = this.cellCount, cols = this.cols, rows = this.rows) {
    this.cellCount = cellCount;
    this.cols = cols;
    this.rows = rows;
    this.gridMin = -Math.floor(this.cellCount / 2);
    this.squares = new Map();
    this._init();
  }

  // alias explicite pour l'UI/controller
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

  // static helper to run the same algorithm directly on a Uint8Array grid
  // grid: Uint8Array (length = cols * rows), values 0/1
  static simpleAlgoOnGrid(grid: Uint8Array, cols: number, rows: number) {
    if (!grid || grid.length !== cols * rows) return;

    // snapshot original black cells
    const blackKeys = new Set<string>();
    for (let r = 0; r < rows; r++) {
      const base = r * cols;
      for (let c = 0; c < cols; c++) {
        if (grid[base + c]) blackKeys.add(`${c},${r}`);
      }
    }
    if (blackKeys.size === 0) return;

    // count toggles for neighbours (excluding original black squares)
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
        if (blackKeys.has(nKey)) continue; // exclude original blacks
        toggleCounts.set(nKey, (toggleCounts.get(nKey) || 0) + 1);
      }
    }

    // set all original black squares to white
    for (const key of blackKeys) {
      const [cStr, rStr] = key.split(",");
      const idx = Number(rStr) * cols + Number(cStr);
      grid[idx] = 0;
    }

    // apply toggles to neighbours according to parity (odd -> toggle)
    for (const [nKey, count] of toggleCounts.entries()) {
      if ((count & 1) === 1) {
        const [cxStr, ryStr] = nKey.split(",");
        const idx = Number(ryStr) * cols + Number(cxStr);
        grid[idx] = grid[idx] ? 0 : 1;
      }
    }
  }

  // static helper to run one Conway "Game of Life" step on a Uint8Array grid
  // grid: Uint8Array (length = cols * rows), values 0/1
  static conwayStepOnGrid(grid: Uint8Array, cols: number, rows: number) {
    if (!grid || grid.length !== cols * rows) return;

    const next = new Uint8Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      const rowBase = r * cols;
      for (let c = 0; c < cols; c++) {
        let neighbors = 0;
        // count 8 neighbours
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
        // Conway rules:
        // - alive with 2 or 3 neighbours stays alive
        // - dead with exactly 3 neighbours becomes alive
        if (alive) {
          next[idx] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          next[idx] = (neighbors === 3) ? 1 : 0;
        }
      }
    }

    // copy next state back into the provided buffer
    grid.set(next);
  }
}
