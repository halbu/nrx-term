import { NRXTile } from './tile';
import { InputHandler } from './input-handler';
import { Point } from './point';
import { InputConstants } from './input-constants';
import { TerminalRenderer } from './terminal-renderer';

export class NRXTerm {
  private _x: number;
  private _y: number;
  private _w: number;
  private _h: number;

  private _tileWidth: number;
  private _tileHeight: number;
  private _fontFamily: string;
  private _fontSize: number;
  
  private _alwaysUppercase = false;

  private tilemap: Array<Array<NRXTile>>;
  private _ctx: CanvasRenderingContext2D;
  private inputHandler: InputHandler;
  private terminalRenderer: TerminalRenderer;

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
    this._ctx = ctx;
    this._fontSize = fontSize;
    this._fontFamily = fontFamily;
    this._x = x;
    this._y = y;
    this._w = w;
    this._h = h;
    this._tileWidth = tileWidth;
    this._tileHeight = tileHeight;

    this.assertPositionAndDimensionsAreValid();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.inputHandler = new InputHandler(this.ctx.canvas);
    this.terminalRenderer = new TerminalRenderer(this);

    this.tilemap = new Array<Array<NRXTile>>();
    this.initialiseTiles();
  }

  // Getters/setters for private members
  get x(): number { return this._x; }
  get y(): number { return this._y; }
  get w(): number { return this._w; }
  get h(): number { return this._h; }
  get ctx(): CanvasRenderingContext2D { return this._ctx; }
  get fontFamily(): string { return this._fontFamily; }
  get fontSize(): number { return this._fontSize; }
  get tileRedrawsThisFrame(): number { return this.terminalRenderer.totalTileDraws; }
  get bgRectDrawsThisFrame(): number { return this.terminalRenderer.bgBatchDraws; }
  get tileWidth(): number { return this._tileWidth; }
  get tileHeight(): number { return this._tileHeight; }

  set alwaysUppercase(au: boolean) { this._alwaysUppercase = au; }

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
   * Draws the complete terminal to the canvas at the specified position. Will only redraw cells that have changed
   * in some way since the last draw, unless a tile's forceRedraw flag has been set to true.
   * @returns {void}
   */
  public render(): void {
    this.terminalRenderer.drawToCanvas();
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
      let lines = new Array<Array<string>>();

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

  /**
   * Resets the input handler variables which track whether a key or mouse button has been pressed this frame, and
   * whether the mouse has been moved this frame. Call this function at the end of every frame cycle in your
   * application loop.
   * @returns void
   */
  public nextFrame(): void {
    this.inputHandler.mouseMovedThisFrame = false;
    this.inputHandler.keysPressedThisFrame = new Array<number>();
  }

  /**
   * Returns true if the specified keycode (or 1000/1001 for left/right mouse buttons) is found in the array of
   * keycodes which represents keys pressed this frame.
   * @param  {number} keycode The JavaScript event keycode of the key in question
   * @returns boolean
   */
  public isKeyDown(keycode: number): boolean {
    return this.keypresses.includes(keycode);
  }

  /**
   * Returns the event keycode of the key pressed this frame, or if a mouse button has been clicked, either 1000 (left
   * mouse button) or 1001 (right mouse button). Returns -1 if neither any key nor any mouse button has been pressed.
   * @returns number
   */
  get keypresses(): Array<number> {
    return this.inputHandler.keysPressedThisFrame;
  }

  /**
   * Returns a JavaScript object literal containing a set of keys representing the event keycodes of all keys on the
   * keyboard that are currently held down (as well as potentially the codes 1000 and 1001 representing the left and
   * right mouse buttons).
   * @returns any
   */
  // tslint:disable-next-line:no-any
  get keyboard(): any {
    return this.inputHandler.keyboardMap;
  }

  /**
   * Returns a Point representing the 2D co-ordinates of the mouse within the canvas.
   * @returns Point
   */
  get mouse(): Point {
    return this.inputHandler.mouse;
  }

  /**
   * Returns a Point representing the mouse's X-Y position in terms of cells within the terminal.
   * FIXME: This function currently assumes that the terminal's upper-left point is at 0,0 on the canvas, which is not
   * guaranteed to be true.
   * @returns Point
   */
  get mouseTerminalPosition(): Point {
    return new Point(
      Math.floor((this.inputHandler.mouse.x - this.x) / this.tileWidth),
      Math.floor((this.inputHandler.mouse.y - this.y) / this.tileHeight)
    );
  }

  /**
   * Returns a JavaScript object literal containing constant values for all mouse buttons and keyboard keys, organised
   * under the two subheadings Input.Mouse and Input.Keys. To be used in (if desired!) place of integer keycodes by
   * dependent applications when checking the state of a particular mouse button or keyboard key.
   * @returns any
   */
  // tslint:disable-next-line:no-any
  static get Input(): any {
    return InputConstants;
  }
}
