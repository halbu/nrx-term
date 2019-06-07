import { NRXTerm } from './terminal';

export class TerminalRenderer {
  private terminal: NRXTerm;
  private backgroundDraws: Map<string, Array<any>>;
  private foregroundDraws: Map<string, Array<any>>;
  public bgBatchDraws = 0;
  public totalTileDraws = 0;
  
  constructor(terminal: NRXTerm) {
    this.terminal = terminal;
    this.backgroundDraws = new Map<string, Array<any>>();
    this.foregroundDraws = new Map<string, Array<any>>();
  }

  /**
   * Draws the complete terminal to the canvas at the specified position. Will only redraw cells that have changed
   * in some way since the last draw, unless a tile's forceRedraw flag has been set to true.
   * @returns {void}
   */
  public drawToCanvas(): void {
    this.bgBatchDraws = 0;
    this.totalTileDraws = 0;

    this.terminal.ctx.font = '' + this.terminal.fontSize + "px '" + this.terminal.fontFamily + "'";

    /*
    The 'backgroundDraws' object is a map, which stores colors as its keys, with the value for each key being an array
    of rects that need to be filled with that color. This method lets the terminal batch together adjacent cells which
    can be filled with a single fillRect() call, and further batches these draws by color, in order that fillStyle()
    only needs to be called once per rendering cycle for each color that needs to be drawn to the canvas.

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
    */
    
    this.backgroundDraws = new Map<string, Array<any>>();
    this.foregroundDraws = new Map<string, Array<any>>();
    let batch;    // Of the form {x: 0, y: 0, w: 0} - represents a rect of solid color to be drawn to the canvas.
    let lx = 0;   // The x position of the last tile that was added to the in-progress batch.
    let lc = '';  // The color of the in-progress batch.
    
    for (let y = 0; y !== this.terminal.h; y++) {
      lx = -99; // Force the next comparison to lx to fail so that the batch ends (we're only trying to batch
                // draws in the x-direction, at least for now).
      for (let x = 0; x !== this.terminal.w; x++) {
        const tile = this.terminal.tileAt(x, y);

        // Does this cell need updating?
        if (!(tile.hasChanged() || tile.forceRedraw)) {
          // No it doesn't. If there's an active batch, add it to the array value associated with the appropriate color
          // key in the backgroundDraws map.
          if (batch) {
            this.addBackgroundBatch(batch, lc);
            // Set the batch to null, as we need to start a new batch for the next cell we find that requires a redraw.
            batch = null;
          }
        } else {
          // Yes it does. Is there an active batch?
          if (!batch) {
            // No there isn't. Generate a new batch of draws starting at our current position and with width 1.
            batch = {x: x, y: y, w: 1};

            // Store the x and bgc values of this cell, so that we can compare them with those of the next cell.
            lx = x;
            lc = tile.bgc;
          } else {
            // Yes there is. Are we attempting to draw the same color at the cell 1 to the right of the last cell?
            if (lx === x - 1 && tile.bgc === lc) {
              // Yes we are. Extend the width of the batch by 1 so this cell will be drawn in the same draw call.
              batch.w++;
              // Increment lx by one so that the next cell will be compared with this cell
              lx = x;
            } else {
              // No we aren't. Add the existing batch to the backgroundDraws map under the appropriate color key...
              this.addBackgroundBatch(batch, lc);
              // ...and generate a new batch for the current cell.
              batch = {x: x, y: y, w: 1};
              
              // Store the x and bgc values of this cell, so that we can compare them with those of the next cell.
              lx = x;
              lc = tile.bgc;
            }
          }

          // Foreground character batching that is again done currently by batching like colors together
          if (this.foregroundDraws[tile.fgc]) {
            this.foregroundDraws[tile.fgc].push({ x: x, y: y, c: tile.char });
          } else {
            this.foregroundDraws[tile.fgc] = [{ x: x, y: y, c: tile.char }];
          }

          tile.forceRedraw = false;
          tile.uncolored = true;
          this.totalTileDraws++;
        }

        tile.cloneTileState(); // Store the state of the tile to detect changes on next redraw
      }
    }
    // We have iterated over every cell. If there's a batch in progress, push it to the backgroundDraws map.
    if (batch) {
      this.addBackgroundBatch(batch, lc);
    }

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

  private drawBackgroundBatches(): void {
    Object.keys(this.backgroundDraws).forEach(k => {
      let colorBatch = this.backgroundDraws[k];
      this.terminal.ctx.fillStyle = k;

      for (let i = 0; i !== colorBatch.length; ++i) {
        this.bgBatchDraws++;
        let r = colorBatch[i];
        this.terminal.ctx.fillRect(
          this.terminal.x + r.x * this.terminal.tileWidth,
          this.terminal.y + r.y * this.terminal.tileHeight,
          r.w * this.terminal.tileWidth,
          this.terminal.tileHeight);
      }
    });
  }

  private drawForegroundBatches(): void {
    Object.keys(this.foregroundDraws).forEach(fgc => {
      this.terminal.ctx.fillStyle = fgc;

      this.foregroundDraws[fgc].forEach(t => {

        const cx = this.terminal.x + t.x * this.terminal.tileWidth + this.terminal.tileWidth / 2;
        const cy = this.terminal.y + t.y * this.terminal.tileHeight + this.terminal.tileHeight / 2;

        this.terminal.ctx.fillText(t.c, cx, cy);
      });
    });
  }
}
