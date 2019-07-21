export class CharacterCache {
  public canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private fontSize: number;
  private fontFamily: string;
  private cellWidth: number;
  private cellHeight: number;
  private quadMap: Map<string, Float32Array>;

  // The set of characters that nrx-terminal will pre-render on startup, hopefully covering most use cases.
  // Characters that are requested after initialisation of the terminal will be rendered and cached on the fly.
  private defaultCharacterSet = ' |.Ø¤Λ↑\'•·~`ABCČĆDĐEFGHIJKLMNOPQRSŠTUVWXYZŽabcčćdđefghijklmnopqrsštuvwxyzžАБВГҐД' +
    'ЂЕЁЄЖЗЅИІЇЙЈКЛЉМНЊОПРСТЋУЎФХЦЧЏШЩЪЫЬЭЮЯабвгґдђеёєжзѕиіїйјклљмнњопрстћуўфхцчџшщъыьэюяΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩα' +
    'βγδεζηθικλμνξοπρστυφχψω1234567890‘?’“!”"`(%)[#]{@}/&\<-+÷×=>®©$€£¥¢:;,.*';
  
  private blockSizePx: number;
  private canvasSize: number;
  private characterIndex = 0;
  public textureNeedsUpdatingFlag = false;

  constructor(fontSize: number, fontFamily: string, cellWidth: number, cellHeight: number) {
    Object.assign(this, { fontSize, fontFamily, cellWidth, cellHeight });

    // Figure out what the smallest power-of-two canvas size is that can fit a 32x32 map of characters in it of the
    // specified width and height
    this.canvasSize = 2 ** 12;
    const mininumTextureSize = (Math.max(cellWidth, cellHeight) + 2) * 32;
    while (this.canvasSize / 2 > mininumTextureSize) {
      this.canvasSize = this.canvasSize / 2;
    }

    // Create the canvas that will hold our texture atlas, size it appropriately and get and store the context
    this.canvas = <HTMLCanvasElement> document.createElement('canvas');
    this.canvas.id = 'textCacheCanvas';
    this.canvas.setAttribute('height', this.canvasSize.toString());
    this.canvas.setAttribute('width', this.canvasSize.toString());
    this.context = <CanvasRenderingContext2D> this.canvas.getContext('2d');

    this.blockSizePx = fontSize + 2;
    this.canvas.width = this.canvasSize;
    this.canvas.height = this.canvasSize;

    this.quadMap = new Map<string, Float32Array>();

    this.prerenderText();
  }

  private prerenderText(): void {
    this.context.font = '' + this.fontSize + "px '" + this.fontFamily + "'";
    this.context.textBaseline = 'top';
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = '#000000FF';

    // Draw all of our default characters to the canvas and cache the vertices for each in our map.
    for (let i = 0; i !== this.defaultCharacterSet.length; ++i) {
      this.cacheCharacter(this.defaultCharacterSet[i]);
    }
  }

  private cacheCharacter(character: string): void {
    const x = this.characterIndex % 32;
    const y = Math.floor(this.characterIndex / 32);
    // Write the specified character to the canvas. Allow some blank space around each character to prevent them
    // overdrawing each other - this extra space will be clipped out when we return the vertices for the character.
    this.context.fillText(
      character,
      x * this.blockSizePx + 1,
      y * this.blockSizePx + 1);

    // Calculate the clipspace vertices of the two tris that enclose it. Store them in a map for fast lookup
    this.quadMap.set(character, this.createVertexArray(x, y));
    this.characterIndex++;
  }

  // For adding new characters to the atlas while the terminal is running. The GLRenderer checks the boolean flag and
  // will regenerate its texture from our canvas if new characters are added.
  private cacheNewCharacter(character: string): void {
    this.cacheCharacter(character);
    this.textureNeedsUpdatingFlag = true;
  }

  /**
   * Take an X-Y character position and convert it to twelve floating point values, representing two sets of three 2D
   * vertices which define the tris we will pass to a fragment shader in order to render this character
   * @param  {number} x
   * @param  {number} y
   * @returns Float32Array
   */
  private createVertexArray(x: number, y: number): Float32Array {
    const clipX = (x * this.blockSizePx) / this.canvasSize;
    const clipY = 1 - ((y * this.blockSizePx) / this.canvasSize);
    const w = this.cellWidth / this.canvasSize;
    const h = this.cellHeight / this.canvasSize;
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

  // Returns texture-space co-ordinates for the character's quad
  public getCharacterVertices(character: string): Float32Array {
    if (!this.quadMap.get(character)) {
      this.cacheNewCharacter(character);
    }
    
    if (!this.quadMap.get(character)) {
      throw new Error('Tried to retrieve a character which has not been cached in our texture atlas, and which ' +
        'we were not able to cache on the fly.');
    }

    return this.quadMap.get(character);
  }
}
