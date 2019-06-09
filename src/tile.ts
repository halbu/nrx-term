import { Lerp } from './lerp';

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
   * @returns {void}
   */
  public cloneTileState(): void {
    this._previousTileState.bga = this._currentTileState.bga;
    this._previousTileState.bgc = this._currentTileState.bgc;
    this._previousTileState.fgc = this._currentTileState.fgc;
    this._previousTileState.char = this._currentTileState.char;
    this._previousTileState.rot = this._currentTileState.rot;
  }

  /**
   * Tests to see if a tile's foreground has changed in any way (character, color, or rotation).
   * @returns {boolean}
   */
  public hasForegroundChanged(): boolean {
    if (this._currentTileState.char !== this._previousTileState.char) { return true; }
    if (this._currentTileState.fgc !== this._previousTileState.fgc) { return true; }
    if (this._currentTileState.rot !== this._previousTileState.rot) { return true; }
    return false;
  }

  /**
   * Tests to see if a tile's background has changed in any way (color or alpha).
   * @returns {boolean}
   */
  public hasBackgroundChanged(): boolean {
    if (this._currentTileState.bgc !== this._previousTileState.bgc) { return true; }
    if (this._currentTileState.bga !== this._previousTileState.bga) { return true; }
    return false;
  }

  /**
   * Sets the background color to a new color generated by lerping the new and old colors by the given proportion.
   * @param  {number} newBgc The incoming background color to apply.
   * @param  {number} proportion Amount to lerp, where 0 = 100% current color, 1 = 100% new color. Valid range [0 ,1].
   * @returns {void}
   */
  public lerpBgc(newBgc: string, proportion: number): void {
    if (proportion < 0 || proportion > 1) {
      throw new Error ('Attempted to lerp the background color by a proportion (' + proportion + ') outside the ' +
        'acceptable range [0, 1].');
    }

    this._currentTileState.bgc = Lerp.getLerp(newBgc, this._currentTileState.bgc, proportion);
  }

  /**
   * Sets the foreground (character) color to a new color generated by lerping the new and old colors by the given
   * proportion.
   * @param  {number} newFgc The incoming foreground color to apply.
   * @param  {number} proportion Amount to lerp, where 0 = 100% current color, 1 = 100% new color. Valid range [0 ,1].
   * @returns {void}
   */
  public lerpFgc(newFgc: string, proportion: number): void {
    if (proportion < 0 || proportion > 1) {
      throw new Error ('Attempted to lerp the foreground color by a proportion (' + proportion + ') outside the ' +
        'acceptable range [0, 1].');
    }

    this._currentTileState.fgc = Lerp.getLerp(newFgc, this._currentTileState.fgc, proportion);
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
