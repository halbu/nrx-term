import { Point } from './point';
import { InputConstants } from './input-constants';

export class InputHandler {
  private cnv: HTMLCanvasElement;
  public mouse: Point;
  public mouseMovedThisFrame: boolean;
  // tslint:disable-next-line:no-any
  public keyboardMap: any;
  public keysPressedThisFrame: Array<number>;
  public dragInProgress = false;
  public dragOrigin = new Point(-1, -1);
  public dragCompletedThisFrame = true;

  /**
   * @param  {HTMLCanvasElement} cnv The HTML5 Canvas to which we wish to attach our input handler.
   */
  constructor(cnv: HTMLCanvasElement) {
    this.cnv = cnv;
    this.mouse = new Point(0, 0);
    this.mouseMovedThisFrame = false;
    this.keyboardMap = {};
    this.keysPressedThisFrame = new Array<number>();

    this.attachListeners();
  }

  /**
   * Attaches our mouse listeners to the specified canvas, and our keyboard event listeners to the window.
   * @returns void
   */
  public attachListeners(): void {
    window.onkeydown = (e) => {
      if ([InputConstants.Keys.Tab, InputConstants.Keys.Space, InputConstants.Keys.Enter].includes(e.keyCode)) {
        e.preventDefault();
      }
      this.keyboardMap[e.keyCode] = true;
      this.keysPressedThisFrame.push(e.keyCode);
    };

    window.onkeyup = (e) => {
      this.keyboardMap[e.keyCode] = false;
    };

    this.cnv.addEventListener('mousedown', (e) => {
      if (e.which === 1) {
        this.keyboardMap[InputConstants.Mouse.Left] = true;
        this.dragInProgress = true;
        this.dragOrigin = this.mouse.clone();
      } else if (e.which === 3) {
        this.keyboardMap[InputConstants.Mouse.Right] = true;
        this.keysPressedThisFrame.push(InputConstants.Mouse.Right);
      }
    }, false);

    this.cnv.addEventListener('mouseup', (e) => {
      if (e.which === 1) {
        this.keyboardMap[InputConstants.Mouse.Left] = false;
        if (this.isActiveDrag()) {
          this.dragCompletedThisFrame = true;
        } else {
          // Fire left mouse click event only on mouseup, as it is only at this point that we can distinguish the user's
          // intention between a mouse-drag and a simple click.
          this.keysPressedThisFrame.push(InputConstants.Mouse.Left);
        }
        this.dragInProgress = false;
      } else if (e.which === 3) {
        this.keyboardMap[InputConstants.Mouse.Right] = false;
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

  /**
   * There is only considered to be an active mouse-drag in progress if the left mouse button has been pressed and
   * held down, and the mouse subsequently moved more than ten pixels away from the origin point of the drag. The pixel
   * travel check is to ensure that normal mouse-click events are not incorrectly interpreted as mouse-drag attempts.
   * @returns boolean
   */
  public isActiveDrag(): boolean {
    return (this.dragInProgress && this.mouse.distanceTo(this.dragOrigin) > 10);
  }
}
