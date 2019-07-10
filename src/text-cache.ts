export class TextCache {
  public canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private fontSize: number;
  private fontFamily: string;
  private tileWidth: number;
  private tileHeight: number;
  private clipMap: Map<string, Float32Array>;
  private allChars = ' \'•·~`ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZŽabcčćdđefghijklmnopqrsštuvwxyzžАБВГҐДЂЕЁЄЖЗЅИІЇЙЈКЛЉМНЊОПРСТЋУЎФХЦЧЏШЩЪЫЬЭЮЯабвгґдђеёєжзѕиіїйјклљмнњопрстћуўфхцчџшщъыьэюяΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω1234567890‘?’“!”"`(%)[#]{@}/&\<-+÷×=>®©$€£¥¢:;,.*';
  private clipspaceConversionFactor: number;
  private blockSizePx: number;
  private cnvsz: number;

  constructor(fontSize: number, fontFamily: string, tileWidth: number, tileHeight: number) {
    let el = <HTMLCanvasElement> document.getElementById('nrxCanvas');
    this.cnvsz = 512;
    el.insertAdjacentHTML('beforeend', '<canvas id="textCacheCanvas" style="height: ' + this.cnvsz + '; width: ' + this.cnvsz + '; text-align: center;"></canvas>');
    this.canvas = <HTMLCanvasElement> document.getElementById('textCacheCanvas');
    this.context = <CanvasRenderingContext2D> this.canvas.getContext('2d');

    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.blockSizePx = fontSize + 2;

    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;

    this.canvas.width = this.cnvsz;
    this.canvas.height = this.cnvsz;

    this.clipMap = new Map<string, Float32Array>();

    this.context.font = '' + this.fontSize + "px '" + this.fontFamily + "'";
    this.context.textBaseline = 'top';
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#000000FF';

    this.drawAllCharactersToCanvas();
  }

  public drawAllCharactersToCanvas(): void {
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
    let clipX = (x * this.blockSizePx) / this.cnvsz;
    let clipY = 1 - ((y * this.blockSizePx) / this.cnvsz);
    let w = this.tileWidth / this.cnvsz;
    let h = this.tileHeight / this.cnvsz;
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
