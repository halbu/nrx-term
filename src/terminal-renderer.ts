import { NRXTerm } from './terminal';
import { TextCache } from './text-cache';
import { GLRenderer } from './gl-renderer';
import { Color } from './color';

export class TerminalRenderer {
  private terminal: NRXTerm;
  private textCache: TextCache;
  private glRenderer: GLRenderer;

  constructor(terminal: NRXTerm) {
    this.terminal = terminal;
    this.textCache = new TextCache(this.terminal.fontSize, this.terminal.fontFamily, this.terminal.tileWidth, this.terminal.tileHeight);
    this.glRenderer = new GLRenderer(this.terminal, this.textCache, this.terminal.glFgCtx, this.terminal.glBgCtx);
  }

  public drawToCanvas(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        const t = this.terminal.tileAt(i, j);
        this.glRenderer.pushForegroundCharacterAndColorData(i, j, t.char, t.fgc.r / 255, t.fgc.g / 255, t.fgc.b / 255);
        this.glRenderer.pushBackgroundColorData(i, j, t.bgc.r / 255, t.bgc.g / 255, t.bgc.b / 255);
        t.setBga(0.0);
      }
    }

    this.glRenderer.draw();
  }
}
