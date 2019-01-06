export class Tile {
  public currentGlyph: Glyph;
  public previousGlyph: Glyph;
  public uncolored: boolean;
  public forceRedraw = false; // Set true to force a one-off repaint of this tile upon next redraw of the terminal

  constructor() {
    this.currentGlyph = new Glyph();
    this.previousGlyph = new Glyph();
    this.uncolored = true;  // Is there a BG color already here that we should blend?
  }

  /**
   * Stores the state of a Tile, in order that we can later test to see if it requires redrawing.
   * @returns void
   */
  public cloneGlyphState(): void {
    this.previousGlyph.bga = this.currentGlyph.bga;
    this.previousGlyph.bgc = this.currentGlyph.bgc;
    this.previousGlyph.fgc = this.currentGlyph.fgc;
    this.previousGlyph.char = this.currentGlyph.char;
    this.previousGlyph.rot = this.currentGlyph.rot;
  }

  /**
   * Tests to see if a tile has changed in any way (character, foreground color, background color/alpha, or rotation).
   * @returns boolean
   */
  public hasChanged(): boolean {
    if (this.currentGlyph.char !== this.previousGlyph.char) { return true; }
    if (this.currentGlyph.fgc !== this.previousGlyph.fgc) { return true; }
    if (this.currentGlyph.bgc !== this.previousGlyph.bgc) { return true; }
    if (this.currentGlyph.bga !== this.previousGlyph.bga) { return true; }
    if (this.currentGlyph.rot !== this.previousGlyph.rot) { return true; }
    return false;
  }

  // Methods that allow the display characteristics of the Tile to be modified.
  public setFgc(fgc: string): void { this.currentGlyph.fgc = fgc; }
  public setBgc(bgc: string): void { this.currentGlyph.bgc = bgc; }
  public setBga(bga: number): void { this.currentGlyph.bga = bga; }
  public setChar(char: string): void { this.currentGlyph.char = char; }
  public setRot(rot: number): void { this.currentGlyph.rot = rot; }
}

// Holds a representation of what a Tile currently looks like.
class Glyph {
  public char = '?';
  public fgc = '#ff00ff';
  public bgc = '#000000';
  public bga = 1.0;
  public rot = 0;
}
