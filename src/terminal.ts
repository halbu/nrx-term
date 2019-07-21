import { NRXCell } from './cell';
import { InputHandler } from './input-handler';
import { Point } from './point';
import { InputConstants } from './input-constants';
import { TerminalRenderer } from './terminal-renderer';
import { Color } from './color';
import { TextDrawingConstants } from './text-drawing-constants';

export class NRXTerm {
  private _w: number;
  private _h: number;

  private _cellPixelWidth: number;
  private _cellPixelHeight: number;
  private _fontFamily: string;
  private _fontSize: number;

  private _cellGrid: Array<Array<NRXCell>>;

  private _inputHandler: InputHandler;
  private _terminalRenderer: TerminalRenderer;

  private readonly COLOR_DIRECTIVE_INDICATOR = '$';
  private readonly LINE_BREAK_INDICATOR = '^';
  private readonly COLOR_DIRECTIVE_LENGTH = 8;

  /**
   * @param  {HTMLElement} el The HTML Element that the terminal will attach itself to and render itself within
   * @param  {number} w The width of the terminal, specified in terminal cells
   * @param  {number} h The height of the terminal, specified in terminal cells
   * @param  {string} fontFamily The font-family that will be used to draw characters to the terminal
   * @param  {number} fontSize Font size, in points, that will be used to draw characters to the terminal
   * @param  {number} cellPixelWidth The width of a terminal cell, in pixels
   * @param  {number} cellPixelHeight The height of a terminal cell, in pixels
   */
  constructor(el: HTMLElement, w: number, h: number,
    fontFamily: string, fontSize: number, cellPixelWidth: number, cellPixelHeight: number) {

    this._fontSize = fontSize;
    this._fontFamily = fontFamily;
    this._w = w;
    this._h = h;
    this._cellPixelWidth = cellPixelWidth;
    this._cellPixelHeight = cellPixelHeight;

    this._terminalRenderer = new TerminalRenderer(this, el, w, h, cellPixelWidth, cellPixelHeight);
    this._inputHandler = new InputHandler(this._terminalRenderer.inputCanvas);

    this._cellGrid = new Array<Array<NRXCell>>();
    this.initialiseCells();
  }

  // Getters for private members. The user may want to refer back to these
  // properties after initialisation, but we should not allow them to change.
  get w(): number { return this._w; }
  get h(): number { return this._h; }
  get fontFamily(): string { return this._fontFamily; }
  get fontSize(): number { return this._fontSize; }
  get cellPixelWidth(): number { return this._cellPixelWidth; }
  get cellPixelHeight(): number { return this._cellPixelHeight; }
  get canvasWidth(): number { return this.cellPixelWidth * this.w; }
  get canvasHeight(): number { return this.cellPixelHeight * this.h; }

  /**
   * Sets up the 2D array of Cells that represent the entire terminal.
   * @returns void
   */
  private initialiseCells(): void {
    this._cellGrid = new Array<Array<NRXCell>>();
    for (let i = 0; i !== this._w; ++i) {
      this._cellGrid[i] = Array<NRXCell>();
      for (let j = 0; j !== this._h; ++j) {
        this._cellGrid[i][j] = new NRXCell();
      }
    }
  }

  /**
   * Draws the complete terminal to the canvases. Redraws everything, every frame. Yeehaw
   * @returns {void}
   */
  public render(): void {
    this._terminalRenderer.drawToCanvas();
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
   * Returns the cell object at the specified location within the terminal.
   * @param  {number} x X-position of cell to retrieve
   * @param  {number} y X-position of cell to retrieve
   * @returns {NRXCell} The cell object at the specified location.
   */
  public cell(x: number, y: number): NRXCell {
    if (!this.withinTerminal(x, y)) {
      throw new Error('Attempted to retrieve a cell that was outside the terminal (requested co-ordinates: '
        + x + ':' + y + ', terminal size ' + this._w + ':' + this._h + '.');
    }

    return this._cellGrid[x][y];
  }

  /**
   * Blanks a rectangular section of the terminal (setting all foreground characters within this rectangle to
   * whitespace) and sets the background color of all cells within the rectangle to the specified color c
   * @param  {number} x X-position of the top-left point of the rectangle to fill
   * @param  {number} y Y-position of the top-left point of the rectangle to fill
   * @param  {number} width Width in cells of the rectangle to fill
   * @param  {number} height Height in cells of the rectangle to fill
   * @param  {string} fillColor Color (as hex string) to fill the rectangle with - black if this param is null.
   * @returns void
   */
  public fillRect(x: number, y: number, width: number, height: number, fillColor?: string): void {
    let fillCol = (fillColor) ? Color.hexToRgb(fillColor) : new Color(0, 0, 0);
    for (let i = 0; i !== width; ++i) {
      for (let j = 0; j !== height; ++j) {
        if (this.withinTerminal(i, j)) {
          const currentCell = this.cell(i + x, j + y);
          currentCell.setBgc(fillCol.r, fillCol.g, fillCol.b);
          currentCell.setChar(' ');
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
   * @param  {number} alignment (Optional) An option defined by the TextDrawingConstants.Alignment enum that governs
   * whether the text will be drawn aligned to the left, right or center. Defaults to left alignment if null.
   * @returns {number}
   */
  public drawString(str: string, x: number, y: number, color?: string, width?: number, alignment?: number): number {
    let wordXPosition = 0;
    let yOffset = 0;
    width = width || Number.MAX_VALUE;

    const baseColor = color ? Color.hexToRgb(color) : new Color(255, 255, 255);

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
        if (alignment === TextDrawingConstants.Alignment.Right && width < Number.MAX_VALUE) {
          const lineWidth = line.map(word => {
            return this.lengthWithoutColorDirectives(word);
          }).reduce((a, b) => a + b) + (line.length - 1);
          wordXPosition += width - lineWidth;
        } else if (alignment === TextDrawingConstants.Alignment.Center && width < Number.MAX_VALUE) {
          const lineWidth = line.map(word => {
            return this.lengthWithoutColorDirectives(word);
          }).reduce((a, b) => a + b) + (line.length - 1);
          wordXPosition += Math.floor(width / 2 - lineWidth / 2);
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
                currentColor = Color.hexToRgb('#' + substr);
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
                const currentCell = this.cell(cx, cy);

                currentCell.setChar(word[i]);
                if (isColorSwitched) {
                  currentCell.setFgc(currentColor.r, currentColor.g, currentColor.b);
                } else {
                  currentCell.setFgc(baseColor.r, baseColor.g, baseColor.b);
                }
                currentCell.setRot(0);  // My assumption is that the user will never want to draw a string to the
                // terminal with characters that inherit any existing rotation on the
                // underlying cell...
              }

              xOffset++;
            }

            // If this is not the last word of this line, and we have sufficient room to do so, add a space
            if (i === word.length - 1 && w !== line.length - 1) {
              if (this.withinTerminal(x + wordXPosition + xOffset, y + yOffset)) {
                this.cell(x + wordXPosition + xOffset, y + yOffset).setChar(' ');
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
   * Resets the input handler variables which track whether a key or mouse button has been pressed this frame, whether
   * the mouse has been moved this frame, and whether a mouse-drag action has been completed this frame. Call this
   * function at the end of every frame cycle in your application loop.
   * @returns void
   */
  public nextFrame(): void {
    this._inputHandler.mouseMovedThisFrame = false;
    this._inputHandler.inputsThisFrame = new Array<number>();
    this._inputHandler.dragCompletedThisFrame = false;
  }

  /**
   * Returns true if the specified keycode (or left/right mouse up/down codes) is found in the array of constants which
   * represent inputs registered this frame.
   * @param  {number} keycode The JavaScript event keycode of the key or mouse button in question
   * @returns boolean
   */
  public inputThisFrame(keycode: number): boolean {
    return this.inputs.includes(keycode);
  }

  /**
   * Returns an array of numbers, representing a complete collection of keycodes for keydown, mousedown and mouseup
   * events that have occurred this frame.
   * @returns Array
   */
  get inputs(): Array<number> {
    return this._inputHandler.inputsThisFrame;
  }

  /**
   * Returns a JavaScript object literal containing a set of keys representing the event keycodes of all keys on the
   * keyboard that are currently held down (as well as potentially the codes 1000 and 1001 representing the left and
   * right mouse buttons).
   * @returns any
   */
  // tslint:disable-next-line:no-any
  get keyboard(): any {
    return this._inputHandler.keyboardMap;
  }

  /**
   * Returns a Point representing the 2D pixel co-ordinates of the mouse within the canvas.
   * @returns Point
   */
  get mouse(): Point {
    return this._inputHandler.mouse;
  }

  /**
   * Returns a constant representing the state of any mouse-drag action that may be in progress. The possible states
   * are defined in InputConstants.Mouse.DragStatus, and are None, Active (the left mouse button has been pressed and
   * the mouse moved more than ten pixels from the mousedown event) and Completed (the left mouse button was released
   * this frame, ending a mouse-drag action that was in progress).
   * @returns number
   */
  get dragStatus(): number {
    if (this._inputHandler.isActiveDrag()) {
      return InputConstants.Mouse.DragStatus.Active;
    } else if (this._inputHandler.dragCompletedThisFrame) {
      return InputConstants.Mouse.DragStatus.Finished;
    } else {
      return InputConstants.Mouse.DragStatus.None;
    }
  }

  /**
   * Returns a tuple of Points representing the start and end cells of a mouse-drag action, or null if no mouse-drag
   * action is currently in progress.
   * @returns [Point, Point]
   */
  get dragPoints(): [Point, Point] {
    if (this.dragStatus !== InputConstants.Mouse.DragStatus.None) {
      return [
        this.canvasToTerminal(this._inputHandler.dragOrigin),
        this.canvasToTerminal(this._inputHandler.mouse)
      ];
    } else {
      return [new Point(-1, -1), new Point(-1, -1)];
    }
  }

  /**
   * Accepts a Point containing 2D pixel co-ordinates with the terminal's canvas, and returns a Point containing the 2D
   * co-ordinates of the terminal cell that those pixel co-ordinates are within.
   * co-ordinates.
   * @param  {Point} p The Point containing the pixel co-ordinates to be converted to a cell position.
   * @returns Point
   */
  private canvasToTerminal(p: Point): Point {
    return new Point(
      Math.floor(p.x / this.cellPixelWidth),
      Math.floor(p.y / this.cellPixelHeight)
    );
  }

  /**
   * Returns a Point representing the mouse's X-Y position in terms of cells within the terminal.
   * @returns Point
   */
  get mouseTerminalPosition(): Point {
    return this.canvasToTerminal(this._inputHandler.mouse);
  }

  /**
   * Returns a JavaScript object literal containing constant values for all keyboard keys, mouse buttons, and mouse
   * actions, organised under the two subheadings Input.Mouse and Input.Keys. To be used in (if desired!) place of
   * integer keycodes by dependent applications when checking the state of a particular mouse button, action, or
   * keyboard key.
   * @returns any
   */
  // tslint:disable-next-line:no-any
  static get Input(): any {
    return InputConstants;
  }

  /**
   * Returns a JavaScript object literal containing constant values for all keyboard keys, mouse buttons, and mouse
   * actions, organised under the two subheadings Input.Mouse and Input.Keys. To be used in (if desired!) place of
   * integer keycodes by dependent applications when checking the state of a particular mouse button, action, or
   * keyboard key.
   * @returns any
   */
  // tslint:disable-next-line:no-any
  static get TextAlignment(): any {
    return TextDrawingConstants.Alignment;
  }
}
