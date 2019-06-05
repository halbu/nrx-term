import { Point } from './point';

export class InputHandler {
  private cnv: HTMLCanvasElement;
  // tslint:disable-next-line:no-any
  public mouse: Point;
  public mouseMovedThisFrame: boolean;
  // tslint:disable-next-line:no-any
  public keyboardMap: any;
  public keyPressedThisFrame: number;

  /**
   * @param  {HTMLCanvasElement} cnv The HTML5 Canvas to which we wish to attach our input handler.
   */
  constructor(cnv: HTMLCanvasElement) {
    this.cnv = cnv;
    this.mouse = new Point(0, 0);
    this.mouseMovedThisFrame = false;
    this.keyboardMap = {};
    this.keyPressedThisFrame = -1;

    this.attachListeners();
  }

  /**
   * Attaches our mouse listeners to the specified canvas, and our keyboard event listeners to the window.
   * @returns void
   */
  public attachListeners(): void {
    window.onkeydown = (e) => {
      if (e.keyCode === 18 || e.keyCode === 32 || e.keyCode === 9) {
        e.preventDefault();
      }
      this.keyboardMap[e.keyCode] = true;
      this.keyPressedThisFrame = e.keyCode;
    };

    window.onkeyup = (e) => {
      this.keyboardMap[e.keyCode] = false;
    };

    this.cnv.addEventListener('mousedown', (e) => {
      if (e.which === 1) {
        this.keyboardMap.M1 = true;
        this.keyPressedThisFrame = 1000;
      } else if (e.which === 3) {
        this.keyboardMap.M2 = true;
        this.keyPressedThisFrame = 1001;
      }
    }, false);

    this.cnv.addEventListener('mouseup', (e) => {
      if (e.which === 1) {
        this.keyboardMap.M1 = false;
      } else if (e.which === 3) {
        this.keyboardMap.M2 = false;
      }
    }, false);

    this.cnv.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX - this.cnv.getBoundingClientRect().left;
      this.mouse.y = e.clientY - this.cnv.getBoundingClientRect().top;
      this.mouseMovedThisFrame = true;
    }, false);

    this.cnv.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, false);
  }
}
