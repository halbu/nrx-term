export class TextCache {
  public canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private fontSize: number;
  private fontFamily: string;
  private tileWidth: number;
  private tileHeight: number;
  private clipMap: Map<string, Float32Array>;
  private allChars = ' \'•·~`ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZŽabcčćdđefghijklmnopqrsštuvwxyzžАБВГҐДЂЕЁЄЖЗЅИІЇЙЈКЛЉМНЊОПРСТЋУЎФХЦЧЏШЩЪЫЬЭЮЯабвгґдђеёєжзѕиіїйјклљмнњопрстћуўфхцчџшщъыьэюяΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω1234567890‘?’“!”"`(%)[#]{@}/&\<-+÷×=>®©$€£¥¢:;,.*';
  private blockSizePx: number;
  private canvasSize: number;

  constructor(fontSize: number, fontFamily: string, tileWidth: number, tileHeight: number) {
    Object.assign(this, { fontSize, fontFamily, tileWidth, tileHeight });

    // Figure out what the smallest power-of-two canvas size is that can fit a 32x32 map of characters in it
    this.canvasSize = 2 ** 12;
    const mininumTextureSize = (Math.max(tileWidth, tileHeight) + 2) * 32;
    while (this.canvasSize / 2 > mininumTextureSize) {
      this.canvasSize = this.canvasSize / 2;
    }

    // Create the canvas that will hold our texture atlas, size it appropriately and get the context
    this.canvas = <HTMLCanvasElement> document.createElement('canvas');
    this.canvas.id = 'textCacheCanvas';
    this.canvas.setAttribute('height', this.canvasSize.toString()); // = "height: ' + this.canvasSize + '; width: ' + this.canvasSize'";
    this.canvas.setAttribute('width', this.canvasSize.toString()); // = "height: ' + this.canvasSize + '; width: ' + this.canvasSize'";
    this.context = <CanvasRenderingContext2D> this.canvas.getContext('2d');

    this.blockSizePx = fontSize + 2;
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;

    this.clipMap = new Map<string, Float32Array>();

    this.drawAllCharactersToCanvas();
  }

  public drawAllCharactersToCanvas(): void {
    this.context.font = '' + this.fontSize + "px '" + this.fontFamily + "'";
    this.context.textBaseline = 'top';
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#000000FF';

    for (let i = 0; i !== 16; ++i) {
      for (let j = 0; j !== 16; ++j) {
        if (this.allChars[j * 16 + i]) {

          // Write the nth character to the canvas. Allow some blank space around each character to prevent them
          // overdrawing each other - this extra space will be clipped out when we return the vertices for the character.
          this.context.fillText(
            this.allChars[j * 16 + i],
            i * this.blockSizePx + 1,
            j * this.blockSizePx + 1);

          // Calculate the clipspace vertices of the two tris that enclose it. Cache them in a map for fast lookup
          this.clipMap.set(this.allChars[j * 16 + i], this.createClipspaceArray(i, j));
        }
      }
    }
  }

  /**
   * Take an X-Y character position and convert it to twelve floating point values, representing two sets of three 2D
   * vertices in clipspace which define the tris we will pass to a fragment shader in order to render this character
   * @param  {number} x
   * @param  {number} y
   * @returns Float32Array
   */
  private createClipspaceArray(x: number, y: number): Float32Array {
    const clipX = (x * this.blockSizePx) / this.canvasSize;
    const clipY = 1 - ((y * this.blockSizePx) / this.canvasSize);
    const w = this.tileWidth / this.canvasSize;
    const h = this.tileHeight / this.canvasSize;
    let clips = [
      clipX, clipY,
      clipX + w, clipY,
      clipX + w, clipY - h,
      clipX, clipY,
      clipX, clipY - h,
      clipX + w, clipY - h
    ];
    return new Float32Array(clips);
  }

  // Returns clipspace co-ordinates for the character texture
  public getCharacterVertices(character: string): Float32Array {
    if (!this.clipMap.get(character)) {
      throw new Error('Tried to retrieve a character which has not been cached in our texture atlas.');
    }
    return this.clipMap.get(character);
  }
}
