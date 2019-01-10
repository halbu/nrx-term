import { NRXTile } from './tile';

export class NRXTerm {
  private _x: number;
  private _y: number;
  private _w: number;
  private _h: number;

  private tilemap: Array<Array<NRXTile>>;
  private ctx: CanvasRenderingContext2D;
  private tileRedrawsThisFrame = 0;
  private fontFamily: string;
  private fontSize: number;
  private alwaysUppercase = false;
  
  private _tileWidth: number;
  private _tileHeight: number;
  private _defaultBgColor = '#000000';

  private COLOR_DIRECTIVE_INDICATOR = '$';
  private COLOR_DIRECTIVE_LENGTH = 8;

  /**
   * @param  {number} x The X position of the terminal within the canvas (pixels from left edge)
   * @param  {number} y The Y position of the terminal within the canvas (pixels from top edge)
   * @param  {number} w The width of the terminal, specified in terminal cells
   * @param  {number} h The height of the terminal, specified in terminal cells
   * @param  {CanvasRenderingContext2D} ctx The rendering context of the canvas that the terminal will be drawn to
   * @param  {string} fontFamily The font-family that will be used to draw characters to the terminal
   * @param  {number} fontSize Font size, in points, that will be used to draw characters to the terminal
   * @param  {number} _tileWidth The width of a terminal tile, in pixels
   * @param  {number} _tileHeight The height of a terminal tile, in pixels
   */
  constructor(x: number, y: number, w: number, h: number, ctx: CanvasRenderingContext2D, fontFamily: string,
    fontSize: number, tileWidth: number, tileHeight: number)
  {
    this.ctx = ctx;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this._x = x;
    this._y = y;
    this._w = w;
    this._h = h;
    this._tileWidth = tileWidth;
    this._tileHeight = tileHeight;

    this.assertPositionAndDimensionsAreValid();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.tilemap = [[]]; // To make the compiler happy
    this.initialiseTiles();

    this.ctx.font = '' + this.fontSize + "px '" + this.fontFamily + "'";
  }
  
  // Getters/setters for private members
  get x(): number                   { return this._x; }
  get y(): number                   { return this._y; }
  get w(): number                   { return this._w; }
  get h(): number                   { return this._h; }
  get tileRedraws(): number         { return this.tileRedrawsThisFrame; }
  get tileWidth(): number           { return this._tileWidth; }
  get tileHeight(): number          { return this._tileHeight; }
  set defaultBgColor(dbgc: string)  { this._defaultBgColor = dbgc; }
  
  /**
   * Sets up the 2D array of Tiles that represent the entire terminal.
   * @returns void
   */
  private initialiseTiles(): void {
    this.tilemap = new Array<Array<NRXTile>>();
    for (let i = 0; i !== this._w; ++i) {
      this.tilemap[i] = Array<NRXTile>();
      for (let j = 0; j !== this._h; ++j) {
        this.tilemap[i][j] = new NRXTile();
      }
    }
  }
  
  /**
   * Resizes and repositions the terminal within the canvas.
   * @param  {number} x The X position of the terminal within the canvas (pixels from left edge)
   * @param  {number} y The Y position of the terminal within the canvas (pixels from top edge)
   * @param  {number} w The width of the terminal, specified in terminal cells
   * @param  {number} h The height of the terminal, specified in terminal cells
   * @returns void
   */
  public resize(x: number, y: number, w: number, h: number): void {
    this._x = x;
    this._y = y;
    this._w = w;
    this._h = h;
    this.initialiseTiles();
    this.assertPositionAndDimensionsAreValid();
  }

  /**
   * Sanity check, throws an error if any part of the terminal is outside the bounds of the canvas. Can be called again
   * by the user if the canvas or the terminal are resized or moved.
   * @returns void
   */
  public assertPositionAndDimensionsAreValid(): void {
    if (
      this.x + this.w * this._tileWidth > this.ctx.canvas.width ||
      this.y + this.h * this._tileHeight > this.ctx.canvas.height ||
      this.x < 0 ||
      this.y < 0
    ) {
      throw new Error('A terminal has been instantiated with dimensions such that it'
        + ' would attempt to draw outside the boundaries of its parent canvas.');
    }
  }

  /**
   * @param  {number} x X-position to test
   * @param  {number} y Y-position to test
   * @returns boolean Reports whether the specified x-y location is a valid position within the bounds of the terminal
   */
  public withinTerminal(x: number, y: number): boolean {
    return (x >= 0 && x < this.w && y >= 0 && y < this.h);
  }

  /**
   * Returns the tile object at the specified location within the terminal.
   * @param  {number} x X-position of tile to retrieve
   * @param  {number} y X-position of tile to retrieve
   * @returns NRXTile The tile at the specified location. Errors if attempting to obtain a tile that doesn't exist.
   */
  public tileAt(x: number, y: number): NRXTile {
    if (!this.withinTerminal(x, y)) {
      throw new Error('Attempted to retrieve a tile that was outside the terminal.');
    }

    return this.tilemap[x][y];
  }

  /**
   * Draws the complete terminal to the canvas at the specified position. Will only redraw cells that have changed
   * in some way since the last draw, unless a tile's forceRedraw flag has been set to true.
   * @returns void
   */
  public drawToCanvas(): void {
    this.ctx.font = '' + this.fontSize + "px '" + this.fontFamily + "'";
    this.tileRedrawsThisFrame = 0;

    for (let x = 0; x !== this.w; x++) {
      for (let y = 0; y !== this.h; y++) {
        const tile = this.tileAt(x, y);

        if (tile.hasChanged() || tile.forceRedraw) {
          this.tileRedrawsThisFrame++;
          this.paintBgColor(x, y, tile.bgc, tile.bga);
          this.paintFgCharacter(x, y, (this.alwaysUppercase) ? tile.char.toUpperCase() : tile.char, tile.fgc, tile.rot);
          tile.forceRedraw = false;
          tile.uncolored = true;
        }

        tile.cloneTileState(); // Store the state of the tile to detect changes on next redraw
      }
    }
  }

  /**
   * Fills a tile entirely with the specified color at the specified alpha value.
   * @param  {number} x X-position of tile to paint color to
   * @param  {number} y Y-position of tile to paint color to
   * @param  {string} c Color (in form '#ff00ff') to paint as background color
   * @param  {number} a Alpha value of color
   * @returns void
   */
  private paintBgColor(x: number, y: number, c: string, a: number): void {
    // Black out the Tile on the canvas
    this.ctx.fillStyle = this._defaultBgColor;
    this.ctx.fillRect(this.x + x * this._tileWidth, this.y + y * this._tileHeight, this._tileWidth, this._tileHeight);

    // Apply alpha if it has been specified
    if (a) {
      this.ctx.globalAlpha = a;
    }

    // Paint new background color to tile
    this.ctx.fillStyle = c;
    this.ctx.fillRect(this.x + x * this._tileWidth, this.y + y * this._tileHeight, this._tileWidth, this._tileHeight);
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * @param  {number} x The x-position of the tile to draw the foreground character to
   * @param  {number} y The y-position of the tile to draw the foreground character to
   * @param  {string} s The character to draw
   * @param  {string} c The color to use to draw the character. Defaults to white
   * @param  {number} rotationAngle The amount of rotation (in radians) to be applied to the character
   * @returns void
   */
  private paintFgCharacter(x: number, y: number, s: string, c: string, rotationAngle: number): void {
    this.ctx.fillStyle = (c === null) ? 'white' : c;

    if (rotationAngle && rotationAngle !== 0) {
      this.ctx.save();
      this.ctx.translate(
        this.x + x * this._tileWidth + this._tileWidth / 2,
        this.y + y * this._tileHeight + this._tileHeight / 2
      );
      this.ctx.rotate(rotationAngle);
      this.ctx.fillText(s, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.fillText(s,
        this.x + x * this._tileWidth + this._tileWidth / 2,
        this.y + y * this._tileHeight + this._tileHeight / 2
      );
    }
  }

  /**
   * Writes a string to the terminal, wrapping to a new line with the same x-position if the string runs off the right
   * edge of the terminal.
   * @param  {string} str The string to be written to the terminal. Color directives can be added within the string if
   * there is a need for the string to be multicolored, e.g.: 'Normal text, $[FF00FF]purple text$, normal text again.'
   * @param  {number} x X-position to begin writing the string at
   * @param  {number} y Y-position to begin writing the string at
   * @param  {string} color (Optional) The color of the text. Defaults to white
   * @param  {number} width (Optional) The maximum width of a line in characters before wrapping.
   * @returns number The number of vertical lines that were used to write the complete string
   */
  public drawString(str: string, x: number, y: number, color?: string, width?: number): number {
    let wordXPosition = 0;
    let yOffset = 0;
    let tokens = str.split(' ');

    const baseColor = color ? color : 'white';
    let currentColor = baseColor;
    let isColorSwitched = false;

    for (let t = 0; t !== tokens.length; ++t) {
      const token = tokens[t];
      const tokenLengthWithoutColorDirectives = this.lengthWithoutColorDirectives(token);

      // Move down a line if the next token would overrun the right edge of the terminal, or exceed the maximum width
      if (
        x + wordXPosition + tokenLengthWithoutColorDirectives >= this.w ||
        width && wordXPosition + tokenLengthWithoutColorDirectives > width
      ) {
        yOffset++;
        wordXPosition = 0;
      }

      // Have we wrapped off the bottom of the terminal? Exit here if so
      if (y + yOffset >= this.h) {
        return yOffset;
      }

      // The x-position at which to draw the next character
      let xOffset = 0;

      // Draw the character (or skip it if it is part of a color directive)
      for (let i = 0; i !== token.length; ++i) {
        if (token[i] === this.COLOR_DIRECTIVE_INDICATOR) {
          // If we have hit a color directive...
          if (token[i + 1] === '[') {
            // If it's the beginning of the color directive, change color appropriately and skip the other characters
            // that make up the color directive
            const substr = token.substring(i + 2, i + 8);
            currentColor = '#' + substr;
            i += 8; // Skip past the other eight [123456] characters
            isColorSwitched = true;
          } else {
            // If it's the end of a color directive, switch back to our base color.
            currentColor = baseColor;
            isColorSwitched = false;
          }
        } else {
          this.tileAt(x + wordXPosition + xOffset, y + yOffset).setChar(token[i]);
          this.tileAt(x + wordXPosition + xOffset, y + yOffset).setFgc(isColorSwitched ? currentColor : baseColor);
          xOffset++;
        }

        // If there's room at the edge of the terminal after the word, draw a space
        if (i === token.length - 1) {
          if (this.tileAt(x + wordXPosition + xOffset, y + yOffset)) {
            this.tileAt(x + wordXPosition + xOffset, y + yOffset).setChar(' ');
            wordXPosition++;
          }
        }
      }

      // Move the cursor horizontally by the length of the of the drawn word and reset the xOffset
      wordXPosition += tokenLengthWithoutColorDirectives;
      xOffset = 0;
    }

    return yOffset;
  }

  /**
   * Calculates the length of a given string once all the characters that comprise parts of color directives have been
   * removed.
   * @param  {string} str The string to be written to the terminal
   * @returns number The length, in characters, of the string with all color directive characters removed
   */
  private lengthWithoutColorDirectives(str: string): number {
    let strlen = 0;
    for (let i = 0; i !== str.length; ++i) {
      if (str[i] === this.COLOR_DIRECTIVE_INDICATOR) {
        if (str[i + 1] === '[') {
          i += this.COLOR_DIRECTIVE_LENGTH;
        }
      } else { strlen++; }
    }
    return strlen;
  }
}
