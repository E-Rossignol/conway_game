import Square from "../models/Square";

export default class GridManager {
  cellCount: number;
  visible: number;
  gridMin: number;
  squares: Map<string, Square>;

  constructor(cellCount = 100, visible = 100) {
    this.cellCount = cellCount;
    this.visible = visible;
    this.gridMin = -Math.floor(cellCount / 2);
    this.squares = new Map();
    this._init();
  }

  private _init() {
    this.squares.clear();
    for (let row = 0; row < this.visible; row++) {
      for (let col = 0; col < this.visible; col++) {
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

  setEvenEven() {
    for (const sq of this.squares.values()) {
      const gx = sq.x;
      const gy = sq.y;
      if (Math.abs(gx) % 2 === 0 && Math.abs(gy) % 2 === 0) sq.setColor(1);
      else sq.setColor(0);
    }
  }

  setOddOdd() {
    for (const sq of this.squares.values()) {
      const gx = sq.x;
      const gy = sq.y;
      if (Math.abs(gx) % 2 === 1 && Math.abs(gy) % 2 === 1) sq.setColor(1);
      else sq.setColor(0);
    }
  }

  invertAll() {
    for (const sq of this.squares.values()) sq.toggle();
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

  // Nouvelle méthode : pour chaque (x,y), la nouvelle couleur = couleur du square à x+1 (wrap sur la ligne)
  simpleAlgo() {
    // Préparer un container pour stocker les nouvelles couleurs (key -> color)
    const newColors = new Map<string, 0 | 1>();
    for (const sq of this.squares.values()) {
        const gx = sq.x;
        const gy = sq.y;
        const nextGx = gx + 1 > this.gridMin + this.visible - 1 ? this.gridMin : gx + 1;
        const nextGy = gy + 1 > this.gridMin + this.visible - 1 ? this.gridMin : gy + 1;
        const nextSq = this.getSquare(nextGx, nextGy);
        if (nextSq) {
            newColors.set(sq.key(), nextSq.color);
        }
    }
    // Appliquer les nouvelles couleurs
    for (const [key, color] of newColors.entries()) {
        const sq = this.squares.get(key);
        if (sq) {
            sq.setColor(color);
        }
    }
  }
}
