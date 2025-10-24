import GridManager from "../grid/GridManager";

export default class Controller {
  manager: GridManager;

  constructor(manager: GridManager) {
    this.manager = manager;
  }

  setEvenEven() {
    this.manager.setEvenEven();
  }

  setOddOdd() {
    this.manager.setOddOdd();
  }

  invertAll() {
    this.manager.invertAll();
  }

  resetAll() {
    this.manager.resetAll();
  }

  toggleAt(gx: number, gy: number) {
    this.manager.toggleAt(gx, gy);
  }
    
  simpleAlgo() {
    this.manager.simpleAlgo();
    }
}
