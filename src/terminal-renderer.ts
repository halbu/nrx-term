import { NRXTerm } from './terminal';
import { CharacterCache } from './character-cache';
import { GLRenderer } from './gl-renderer';

export class TerminalRenderer {
  private terminal: NRXTerm;
  private characterCache: CharacterCache;
  private glRenderer: GLRenderer;
  private glFgCnv: HTMLCanvasElement;

  constructor(terminal: NRXTerm, el: HTMLElement, w: number, h: number, cellPixelWidth: number, cellPixelHeight: number) {
    this.terminal = terminal;

    const canvasPixelWidth = w * cellPixelWidth;
    const canvasPixelHeight = h * cellPixelHeight;

    el.insertAdjacentHTML('beforeend', '<canvas id="glBgCtx" style="position: absolute; left: 0; top: 0; z-index: 999; height: ' + canvasPixelHeight + '; width: ' + canvasPixelWidth + '; text-align: center;"></canvas>');
    el.insertAdjacentHTML('beforeend', '<canvas id="glFgCtx" style="position: absolute; left: 0; top: 0; z-index: 998; height: ' + canvasPixelHeight + '; width: ' + canvasPixelWidth + '; text-align: center;"></canvas>');

    let glFgCnv = <HTMLCanvasElement> document.getElementById('glBgCtx');
    let glBgCnv = <HTMLCanvasElement> document.getElementById('glFgCtx');

    [glFgCnv, glBgCnv].forEach(c => {
      c.width = canvasPixelWidth;
      c.height = canvasPixelHeight;
    });

    const glFgCtx = <WebGLRenderingContext> glFgCnv.getContext('webgl');
    const glBgCtx = <WebGLRenderingContext> glBgCnv.getContext('webgl');

    this.glFgCnv = glFgCtx.canvas;

    this.characterCache = new CharacterCache(
      this.terminal.fontSize,
      this.terminal.fontFamily,
      this.terminal.cellPixelWidth,
      this.terminal.cellPixelHeight
    );

    this.glRenderer = new GLRenderer(this.terminal, this.characterCache, glFgCtx, glBgCtx);
  }

  public drawToCanvas(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        const t = this.terminal.cell(i, j);
        this.glRenderer.setForegroundData(i, j, t.char, t.fgc.r / 255, t.fgc.g / 255, t.fgc.b / 255, t.rot);
        this.glRenderer.setBackgroundData(i, j, t.bgc.r / 255, t.bgc.g / 255, t.bgc.b / 255);
      }
    }

    this.glRenderer.draw();
  }

  // Return the uppermost (z-index wise) of our two overlaid canvases, in order that the parent terminal can attach
  // input handlers to it
  get inputCanvas(): HTMLCanvasElement {
    return this.glFgCnv;
  }
}
