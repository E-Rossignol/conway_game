export default class Square {
  x: number;
  y: number;
  color: 0 | 1;

  constructor(x: number, y: number, color: 0 | 1 = 0) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  toggle() {
    this.color = this.color === 1 ? 0 : 1;
  }

  setColor(c: 0 | 1) {
    this.color = c;
  }

  isBlack() {
    return this.color === 1;
  }

  key() {
    return `${this.x},${this.y}`;
  }
}
