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

  simpleAlgo() {
    // 1) snapshot original black squares
    const blackKeys = new Set<string>();
    for (const [key, sq] of this.squares.entries()) {
      if (sq.isBlack()) blackKeys.add(key);
    }

    if (blackKeys.size === 0) return;

    // 2) count toggles for neighbours (excluding original black squares)
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
        const nKey = `${nx},${ny}`;
        // ignore neighbours outside map or neighbours that were black originally
        if (!this.squares.has(nKey) || blackKeys.has(nKey)) continue;
        toggleCounts.set(nKey, (toggleCounts.get(nKey) || 0) + 1);
      }
    }

    // 3) set all original black squares to white (explicit rule)
    for (const key of blackKeys) {
      const sq = this.squares.get(key);
      if (sq) sq.setColor(0);
    }

    // 4) apply toggles to neighbours according to parity (odd -> toggle)
    for (const [nKey, count] of toggleCounts.entries()) {
      if ((count & 1) === 1) {
        const sq = this.squares.get(nKey);
        if (sq) sq.toggle();
      }
    }
  }
}
