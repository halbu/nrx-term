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

  private _alwaysUppercase = false;

  private _tileWidth: number;
  private _tileHeight: number;
  private _defaultBgColor = '#000000';

  private readonly COLOR_DIRECTIVE_INDICATOR = '$';
  private readonly LINE_BREAK_INDICATOR = '^';
  private readonly COLOR_DIRECTIVE_LENGTH = 8;

  /**
   * @param  {number} x The X position of the terminal within the canvas (pixels from left edge)
   * @param  {number} y The Y position of the terminal within the canvas (pixels from top edge)
   * @param  {number} w The width of the terminal, specified in terminal cells
   * @param  {number} h The height of the terminal, specified in terminal cells
   * @param  {CanvasRenderingContext2D} ctx The rendering context of the canvas that the terminal will be drawn to
   * @param  {string} fontFamily The font-family that will be used to draw characters to the terminal
   * @param  {number} fontSize Font size, in points, that will be used to draw characters to the terminal
   * @param  {number} tileWidth The width of a terminal tile, in pixels
   * @param  {number} tileHeight The height of a terminal tile, in pixels
   */
  constructor(x: number, y: number, w: number, h: number, ctx: CanvasRenderingContext2D, fontFamily: string,
    fontSize: number, tileWidth: number, tileHeight: number) {
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
  set alwaysUppercase(au: boolean)  { this._alwaysUppercase = au; }

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
   * Sanity check, throws an error if any part of the terminal is outside the bounds of the canvas.
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
   * Reports whether the specified x-y location is a valid position within the bounds of the terminal
   * @param  {number} x X-position to test
   * @param  {number} y Y-position to test
   * @returns {boolean} Reports whether the specified x-y location is a valid position within the bounds of the terminal
   */
  public withinTerminal(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  /**
   * Returns the tile object at the specified location within the terminal.
   * @param  {number} x X-position of tile to retrieve
   * @param  {number} y X-position of tile to retrieve
   * @returns {NRXTile} The tile object at the specified location.
   */
  public tileAt(x: number, y: number): NRXTile {
    if (!this.withinTerminal(x, y)) {
      throw new Error('Attempted to retrieve a tile that was outside the terminal (requested co-ordinates: '
        + x + ':' + y + ', terminal size ' + this._w + ':' + this._h + '.');
    }

    return this.tilemap[x][y];
  }

  /**
   * Draws the complete terminal to the canvas at the specified position. Will only redraw cells that have changed
   * in some way since the last draw, unless a tile's forceRedraw flag has been set to true.
   * @returns {void}
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
          this.paintFgCharacter(x, y, (this._alwaysUppercase)
            ? tile.char.toUpperCase()
            : tile.char, tile.fgc, tile.rot);
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
   * @returns {void}
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
   * Paints a character, s, to the terminal at position x, y using color c, rotated by angle rotationAngle
   * @param  {number} x The x-position of the tile to draw the foreground character to
   * @param  {number} y The y-position of the tile to draw the foreground character to
   * @param  {string} s The character to draw
   * @param  {string} c The color to use to draw the character. Defaults to white
   * @param  {number} rotationAngle The amount of rotation (in radians) to be applied to the character
   * @returns {void}
   */
  private paintFgCharacter(x: number, y: number, s: string, c: string, rotationAngle: number): void {
    this.ctx.fillStyle = (c === null) ? 'white' : c;

    const cx = this.x + x * this._tileWidth + this._tileWidth / 2;
    const cy = this.y + y * this._tileHeight + this._tileHeight / 2;

    if (rotationAngle && rotationAngle !== 0) {
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(rotationAngle);
      this.ctx.fillText(s, 0, 0);
      this.ctx.restore();
    } else {
      this.ctx.fillText(s, cx, cy);
    }
  }

  /**
   * Blanks a rectangular section of the terminal (setting all foreground characters within this rectangle to
   * whitespace) and sets the background color of all tiles within the rectangle to the specified color c
   * @param  {number} x X-position of the top-left point of the rectangle to fill
   * @param  {number} y Y-position of the top-left point of the rectangle to fill
   * @param  {number} w Width in cells of the rectangle to fill
   * @param  {number} h Height in cells of the rectangle to fill
   * @param  {string} c Color in hex to use to fill the rectangle. Defaults to black
   * @returns void
   */
  public fillRect(x: number, y: number, w: number, h: number, c: string): void {
    for (let i = 0; i !== w; ++i) {
      for (let j = 0; j !== h; ++j) {
        if (this.withinTerminal(i, j)) {
          const currentTile = this.tileAt(i + x, j + y);
          currentTile.setBgc((c === null) ? '#000000' : c);
          currentTile.setChar(' ');
        }
      }
    }
  }

  /**
   * Writes a string to the terminal, wrapping to a new line with the same x-position if the string exceeds the length
   * of the optional width parameter. Strings may be written partially or entirely outside the bounds of the terminal,
   * with any characters of the string which fall outside the bounds of the terminal not being rendered.
   * Returns the number of vertical lines that were used to write the complete string.
   * @param  {string} str The string to be written to the terminal. Color directives can be added within the string if
   * there is a need for the string to be multicolored, e.g.: 'Normal text, $[FF00FF]purple text$, normal text again.'
   * @param  {number} x X-position to begin writing the string at
   * @param  {number} y Y-position to begin writing the string at
   * @param  {string} color (Optional) The color of the text. Defaults to white
   * @param  {number} width (Optional) The maximum width of a line in characters before wrapping.
   * @param  {boolean} rAlign (Optional) If true, right-align the text to the margin at (x + width). Requires the width
   * parameter to have been specified.
   * @returns {number}
   */
  public drawString(str: string, x: number, y: number, color?: string, width?: number, rAlign?: boolean): number {
    let wordXPosition = 0;
    let yOffset = 0;
    width = width || Number.MAX_VALUE;

    const baseColor = color ? color : 'white';
    let currentColor = baseColor;
    let isColorSwitched = false;

    const paragraphs = str.split(this.LINE_BREAK_INDICATOR);

    for (let p = 0; p !== paragraphs.length; ++p) {
      let paragraph = paragraphs[p].split(' ');

      // Split this paragraph into arrays of strings which represent lines of text that fit the appropriate width.
      let lines = new Array<Array<string>> ();

      while (paragraph.length > 0) {
        let lengthOfThisLine = 0;
        let wrappedLine = Array<string>();

        while (paragraph.length > 0 && lengthOfThisLine + this.lengthWithoutColorDirectives(paragraph[0]) <= width) {
          lengthOfThisLine += (this.lengthWithoutColorDirectives(paragraph[0]) + 1);
          wrappedLine.push(<string> paragraph.shift());
        }

        lines.push(wrappedLine);
      }

      // Draw each array of lines to the terminal
      for (let l = 0; l !== lines.length; ++l) {
        const line = lines[l];
        wordXPosition = 0;
        if (rAlign && width < Number.MAX_VALUE) { // Is this second conditional necessary?
          const lineWidth = line.map(wrd => {
            return this.lengthWithoutColorDirectives(wrd);
          }).reduce((a, b) => a + b) + (line.length - 1);
          wordXPosition += width - lineWidth;
        }

        for (let w = 0; w !== line.length; ++w) {
          let xOffset = 0;
          const word = line[w];
          const wordLengthWithoutColorDirectives = this.lengthWithoutColorDirectives(word);

          // Draw the character (or skip it if it is part of a color directive)
          for (let i = 0; i !== word.length; ++i) {
            if (word[i] === this.COLOR_DIRECTIVE_INDICATOR) {
              // If we have hit a color directive...
              if (word[i + 1] === '[') {
                // If it's the beginning of the color directive, change color appropriately and skip the other
                // characters that make up the color directive
                const substr = word.substring(i + 2, i + 8);
                currentColor = '#' + substr;
                i += 8; // Skip past the other eight [123456] characters
                isColorSwitched = true;
              } else {
                // If it's the end of a color directive, switch back to our base color.
                currentColor = baseColor;
                isColorSwitched = false;
              }
            } else {
              const cx = x + wordXPosition + xOffset;
              const cy = y + yOffset;
              if (this.withinTerminal(cx, cy)) {
                const currentTile = this.tileAt(cx, cy);

                currentTile.setChar(word[i]);
                currentTile.setFgc(isColorSwitched ? currentColor : baseColor);
                currentTile.setRot(0);  // My assumption is that the user will never want to draw a string to the
                                        // terminal with characters that inherit any existing rotation on the
                                        // underlying tile...
              }

              xOffset++;
            }

            // If this is not the last word of this line, and we have sufficient room to do so, add a space
            if (i === word.length - 1 && w !== line.length - 1) {
              if (this.withinTerminal(x + wordXPosition + xOffset, y + yOffset)) {
                this.tileAt(x + wordXPosition + xOffset, y + yOffset).setChar(' ');
                wordXPosition++;
              }
            }
          }

          // Move the cursor horizontally by the length of the of the drawn word and reset the xOffset
          wordXPosition += wordLengthWithoutColorDirectives;
          xOffset = 0;
        }
        yOffset++;
      }
    }

    return yOffset;
  }

  /**
   * Calculates the length of a given string once all the characters that comprise parts of color directives have been
   * removed.
   * @param  {string} str The string to be written to the terminal
   * @returns {number} The length, in characters, of the string with all color directive characters removed
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
