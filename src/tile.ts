// Holds a representation of what a tile currently looks like.
class NRXTileState {
  public char = '?';
  public fgc = '#ff00ff';
  public bgc = '#000000';
  public bga = 1.0;
  public rot = 0;
}

export class NRXTile {
  private _currentTileState: NRXTileState;
  private _previousTileState: NRXTileState;
  public uncolored: boolean; // Is there a BG color already here that we should blend?
  public forceRedraw = false; // Set true to force a one-off repaint of this tile upon next redraw of the terminal

  constructor() {
    this._currentTileState = new NRXTileState();
    this._previousTileState = new NRXTileState();
    this.uncolored = true;
  }

  /**
   * Stores the state of a tile, in order that we can later test to see if it requires redrawing.
   * @returns void
   */
  public cloneTileState(): void {
    this._previousTileState.bga = this._currentTileState.bga;
    this._previousTileState.bgc = this._currentTileState.bgc;
    this._previousTileState.fgc = this._currentTileState.fgc;
    this._previousTileState.char = this._currentTileState.char;
    this._previousTileState.rot = this._currentTileState.rot;
  }

  /**
   * Tests to see if a tile has changed in any way (character, foreground color, background color/alpha, or rotation).
   * @returns boolean
   */
  public hasChanged(): boolean {
    if (this._currentTileState.char !== this._previousTileState.char) { return true; }
    if (this._currentTileState.fgc !== this._previousTileState.fgc) { return true; }
    if (this._currentTileState.bgc !== this._previousTileState.bgc) { return true; }
    if (this._currentTileState.bga !== this._previousTileState.bga) { return true; }
    if (this._currentTileState.rot !== this._previousTileState.rot) { return true; }
    return false;
  }

  public lerpBgc(newBgc: string, proportion: number): void {
    if (proportion < 0 || proportion > 1) {
      throw new Error ('Attempted to lerp the background color by a proportion outside the acceptable range [0, 1].');
    }

    this._currentTileState.bgc = this.lerp(newBgc, this._currentTileState.bgc, proportion);
  }

  private lerp(newCol: string, currentCol: string, proportion: number): string {
    let ah = parseInt(newCol.replace(/#/g, ''), 16),
      ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
      bh = parseInt(currentCol.replace(/#/g, ''), 16),
      br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
      rr = ar + proportion * (br - ar),
      rg = ag + proportion * (bg - ag),
      rb = ab + proportion * (bb - ab);

      return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
  }

  // Methods that allow the display characteristics of the tile to be modified.
  public setFgc(fgc: string): void { this._currentTileState.fgc = fgc; }
  public setBgc(bgc: string): void { this._currentTileState.bgc = bgc; }
  public setBga(bga: number): void { this._currentTileState.bga = bga; }
  public setChar(char: string): void { this._currentTileState.char = char; }
  public setRot(rot: number): void { this._currentTileState.rot = rot; }

  // Methods that allow the display characteristics of the tile to be modified.
  get fgc(): string { return this._currentTileState.fgc; }
  get bgc(): string { return this._currentTileState.bgc; }
  get bga(): number { return this._currentTileState.bga; }
  get char(): string { return this._currentTileState.char; }
  get rot(): number { return this._currentTileState.rot; }
}
