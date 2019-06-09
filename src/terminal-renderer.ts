import { NRXTerm } from './terminal';

export class TerminalRenderer {
  private terminal: NRXTerm;
  private backgroundDraws: Map<string, Array<any>>;
  private foregroundDraws: Array<Array<any>>;
  public bgBatchDraws = 0;
  public fgBatchDraws = 0;
  
  constructor(terminal: NRXTerm) {
    this.terminal = terminal;
    this.backgroundDraws = new Map<string, Array<any>>();
    this.foregroundDraws = new Array<Array<any>>();
    this.terminal.fgCtx.font = '' + this.terminal.fontSize + "px '" + this.terminal.fontFamily + "'";
    this.terminal.fgCtx.textBaseline = 'top';
  }

  /**
   * Draws the complete terminal to the canvas at the specified position. Will only redraw cells that have changed
   * in some way since the last draw, unless a tile's forceRedraw flag has been set to true.
   * @returns {void}
   */
  public drawToCanvas(): void {
    this.bgBatchDraws = 0;
    this.fgBatchDraws = 0;

    /*
    The 'backgroundDraws' object is a map, which stores colors as its keys, with the value for each key being an array
    of rects that need to be filled with that color. This structure lets the terminal batch together adjacent cells
    which can be filled with a single fillRect() call, and further batches these draws by color, in order that
    fillStyle() only needs to be called once per rendering cycle for each color that needs to be drawn to the canvas.

    "backgroundDraws": {
      '#000000'; : [
        {x: 0, y: 0, w: 17},
        {x: 22, y: 0, w: 3},
      ],
      '#FF00FF'; : [
        {x: 3, y: 3, w: 3},
        {x: 3, y: 7, w: 14},
      ],
    }

    The 'foregroundDraws' object is an array of arrays of objects. Each element of the outermost array represents a
    terminal line. Each inner array contains a series of objects, each representing a string of a particular color to be
    drawn at a certain point along the line. In this way the terminal can batch together adjacent characters of the same
    foreground color, and write them all to the terminal at once. Assuming the terminal contains a reasonable number
    of horizontally adjacent tiles that have the same foreground color, this cuts down considerably on the number of
    calls to fillText() that the terminal needs to make, which helps a lot as fillText() absolutely murders performance.

    "foregroundDraws": [
      [
        {x: 0, fgc: '#FF00FF', str: 'Test'},
        {x: 5, fgc: '#FFFFFF', str: 'String'}
      ],
      [
        {x: 0, fgc: '#00FF00', str: 'Beginning of second line'}
      ],
    }
    */
    
    this.backgroundDraws = new Map<string, Array<any>>();
    this.foregroundDraws = new Array<Array<any>>();
    
    let lx = 0;   // The x position of the last tile that was added to the in-progress batch.
    let lc = '';  // The color of the in-progress batch.
    let bgDraw: any = null; // {x: 0, y: 0, w: 0} - represents a rect of solid color to be drawn to the canvas.
    let fgDraw: any = null; // {x: 0, fgc: '#ff00ff', str: 'Hi!'} - represents a colored string to be drawn to the canvas.
    
    for (let y = 0; y !== this.terminal.h; y++) {
      lx = -99; // Force the next comparison to lx to fail so that the batch ends (we're only trying to batch
                // draws in the x-direction, at least for now).
      this.foregroundDraws.push(new Array<any>());
      for (let x = 0; x !== this.terminal.w; x++) {
        const tile = this.terminal.tileAt(x, y);

        // Are we writing a foreground batch?
        if (!fgDraw) {
          // No. Create a new one
          fgDraw = {x: x, fgc: tile.fgc, str: tile.char};
        } else {
          // Yes. Has the string to be written changed color?
          if (tile.fgc === fgDraw.fgc) {
            // No. Add this character to the existing batched string
            fgDraw.str += tile.char;
          } else {
            // Yes. Push the existing foreground batch to the array and start a new foreground batch
            this.foregroundDraws[y].push(fgDraw);
            fgDraw = {x: x, fgc: tile.fgc, str: tile.char};
          }
        }

        // Does this cell's background need updating?
        if (!(tile.hasBackgroundChanged() || tile.forceRedraw)) {
          // No it doesn't. If there's an active background batch, add it to the array value associated with the
          // appropriate color key in the backgroundDraws map.
          if (bgDraw) {
            this.addBackgroundBatch(bgDraw, lc);
            // Set the barckground batch to null, as we need to start a new batch for the next cell we find that
            // requires a redraw.
            bgDraw = null;
          }
        } else {
          // Yes it does. Is there an active background batch?
          if (!bgDraw) {
            // No there isn't. Generate a new batch of draws starting at our current position and with width 1.
            bgDraw = {x: x, y: y, w: 1};

            // Store the x and bgc values of this cell, so that we can compare them with those of the next cell.
            lx = x;
            lc = tile.bgc;
          } else {
            // Yes there is. Are we attempting to draw the same color at the cell 1 to the right of the last cell?
            if (lx === x - 1 && tile.bgc === lc) {
              // Yes we are. Extend the width of the batch by 1 so this cell will be drawn in the same draw call.
              bgDraw.w++;
              // Increment lx by one so that the next cell will be compared with this cell
              lx = x;
            } else {
              // No we aren't. Add the existing batch to the backgroundDraws map under the appropriate color key...
              this.addBackgroundBatch(bgDraw, lc);
              // ...and generate a new background batch for the current cell.
              bgDraw = {x: x, y: y, w: 1};
              
              // Store the x and bgc values of this cell, so that we can compare them with those of the next cell.
              lx = x;
              lc = tile.bgc;
            }
          }
        }

        tile.forceRedraw = false;
        tile.uncolored = true;
        tile.cloneTileState(); // Store the state of the tile to detect changes on next redraw
      }
      // Push the final foreground character batch for this terminal row to the foregroundDraws array.
      if (fgDraw) {
        this.foregroundDraws[y].push(fgDraw);
        fgDraw = null;
      }
    }

    // We have iterated over every cell. If there are foreground or background batches in progress, finish them up
    if (bgDraw) { this.addBackgroundBatch(bgDraw, lc); }
    if (fgDraw) { this.foregroundDraws[this.foregroundDraws.length - 1].push(fgDraw); }

    this.drawBackgroundBatches();
    this.drawForegroundBatches();
  }

  private addBackgroundBatch(batch: any, color: string): void {
    if (this.backgroundDraws[color]) {
      this.backgroundDraws[color].push(batch);
    } else {
      this.backgroundDraws[color] = [ batch ];
    } 
  }

  private drawForegroundBatches(): void {
    // I did try clearing only the sections of the foreground canvas that require a redraw, but from my limited testing
    // that actually appears to be significantly less performant than just wiping and redrawing the whole thing? (Only
    // tested on Chrome so far)
    this.terminal.fgCtx.clearRect(0, 0, 1080, 720);

    for (let y = 0; y !== this.foregroundDraws.length; ++y) {
      this.foregroundDraws[y].forEach(draw => {
        this.fgBatchDraws++;
        this.terminal.fgCtx.fillStyle = draw.fgc;
        this.terminal.fgCtx.fillText(draw.str, draw.x * this.terminal.tileWidth, y * this.terminal.tileHeight);
      });
    }
  }

  private drawBackgroundBatches(): void {
    Object.keys(this.backgroundDraws).forEach(k => {
      let colorBatch = this.backgroundDraws[k];
      this.terminal.bgCtx.fillStyle = k;

      for (let i = 0; i !== colorBatch.length; ++i) {
        this.bgBatchDraws++;
        let r = colorBatch[i];
        this.terminal.bgCtx.fillRect(
          this.terminal.x + r.x * this.terminal.tileWidth,
          this.terminal.y + r.y * this.terminal.tileHeight,
          r.w * this.terminal.tileWidth,
          this.terminal.tileHeight);
      }
    });
  }
}
