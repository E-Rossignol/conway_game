import GridManager from "../grid/GridManager";

export default class Controller {
  manager: GridManager;

  constructor(manager: GridManager) {
    this.manager = manager;
  }

  setViewport(cols: number, rows: number) {
    this.manager.setViewport(cols, rows);
  }

  resetAll() {
    this.manager.resetAll();
  }

  toggleAt(gx: number, gy: number) {
    this.manager.toggleAt(gx, gy);
  }
  
}
