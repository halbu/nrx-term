import { CharacterCache } from './character-cache';
import { NRXTerm } from './terminal';
import { GlShaders } from './gl-shaders';

export class GLRenderer {
  private terminal: NRXTerm;
  private characterCache: CharacterCache;
  private textureAtlas: WebGLTexture;

  private glFgCtx: WebGLRenderingContext;
  private glBgCtx: WebGLRenderingContext;

  private fgProgram: WebGLProgram;
  private bgProgram: WebGLProgram;

  private fgVertexAttributeLocation: number;
  private fgTextureAttributeLocation: number;
  private fgColorAttributeLocation: number;
  private fgCentreAttributeLocation: number;
  private fgRotationAttributeLocation: number;
  private bgVertexAttributeLocation: number;
  private bgColorAttributeLocation: number;

  private fgVertexBuffer: WebGLBuffer;
  private fgVertexCentreBuffer: WebGLBuffer;
  private fgRotationBuffer: WebGLBuffer;
  private bgVertexBuffer: WebGLBuffer;
  private fgTextureBuffer: WebGLBuffer;
  private fgcBuffer: WebGLBuffer;
  private bgcBuffer: WebGLBuffer;

  private terminalCellVertices: Float32Array;
  private centrePointCoordinates: Float32Array;
  private rotationValues: Float32Array;
  private textureVertices: Float32Array;
  private fgColorValues: Float32Array;
  private bgColorValues: Float32Array;

  private readonly FLOATS_PER_QUAD = 12;

  constructor(
    terminal: NRXTerm,
    textCache: CharacterCache,
    glFgCtx: WebGLRenderingContext,
    glBgCtx: WebGLRenderingContext) {

    this.terminal = terminal;
    this.characterCache = textCache;
    this.glFgCtx = glFgCtx;
    this.glBgCtx = glBgCtx;

    this.setupShaders();

    const totalNumberOfPoints = this.terminal.w * this.terminal.h * this.FLOATS_PER_QUAD;

    this.terminalCellVertices = new Float32Array(totalNumberOfPoints);
    this.centrePointCoordinates = new Float32Array(totalNumberOfPoints);
    this.rotationValues = new Float32Array(totalNumberOfPoints / 2);
    this.textureVertices = new Float32Array(totalNumberOfPoints);
    this.fgColorValues = new Float32Array(totalNumberOfPoints * 2);
    this.bgColorValues = new Float32Array(totalNumberOfPoints * 2);

    this.fgVertexBuffer = this.glFgCtx.createBuffer();
    this.fgVertexCentreBuffer = this.glFgCtx.createBuffer();
    this.fgRotationBuffer = this.glFgCtx.createBuffer();
    this.fgTextureBuffer = this.glFgCtx.createBuffer();
    this.fgcBuffer = this.glFgCtx.createBuffer();

    this.bgVertexBuffer = this.glBgCtx.createBuffer();
    this.bgcBuffer = this.glBgCtx.createBuffer();

    this.initialiseData();
  }

  private readTextureFromCharacterCacheCanvas(): void {
    this.textureAtlas = <WebGLTexture>this.glFgCtx.createTexture();
    this.glFgCtx.bindTexture(this.glFgCtx.TEXTURE_2D, this.textureAtlas);
    this.glFgCtx.pixelStorei(this.glFgCtx.UNPACK_FLIP_Y_WEBGL, 1);
    this.glFgCtx.texParameteri(this.glFgCtx.TEXTURE_2D, this.glFgCtx.TEXTURE_MIN_FILTER, this.glFgCtx.LINEAR);
    this.glFgCtx.texParameteri(this.glFgCtx.TEXTURE_2D, this.glFgCtx.TEXTURE_MAG_FILTER, this.glFgCtx.LINEAR);
    this.glFgCtx.texImage2D(this.glFgCtx.TEXTURE_2D, 0, this.glFgCtx.RGBA, this.glFgCtx.RGBA, this.glFgCtx.UNSIGNED_BYTE, this.characterCache.canvas);
  }

  private setupProgram(
    glCtx: WebGLRenderingContext,
    vertexShaderSrc: string,
    fragmentShaderSrc: string,
    glProgram: WebGLProgram): void {

    const vertexShader = glCtx.createShader(glCtx.VERTEX_SHADER);
    const fragmentShader = glCtx.createShader(glCtx.FRAGMENT_SHADER);

    glCtx.shaderSource(vertexShader, vertexShaderSrc);
    glCtx.shaderSource(fragmentShader, fragmentShaderSrc);

    glCtx.compileShader(vertexShader);
    glCtx.compileShader(fragmentShader);

    glCtx.attachShader(glProgram, vertexShader);
    glCtx.attachShader(glProgram, fragmentShader);

    glCtx.linkProgram(glProgram);
    glCtx.useProgram(glProgram);
  }

  private setupShaders(): void {
    // Set up foreground-layer shaders and program

    this.fgProgram = <WebGLProgram>this.glFgCtx.createProgram();
    this.setupProgram(this.glFgCtx, GlShaders.vertexShaderFgSrc, GlShaders.fragmentShaderFgSrc, this.fgProgram);

    this.readTextureFromCharacterCacheCanvas();

    this.glFgCtx.enable(this.glFgCtx.BLEND);
    this.glFgCtx.blendFunc(this.glFgCtx.CONSTANT_COLOR, this.glFgCtx.SRC_ALPHA);
    this.glFgCtx.blendFuncSeparate(this.glFgCtx.SRC_ALPHA, this.glFgCtx.ONE_MINUS_SRC_ALPHA, this.glFgCtx.ONE, this.glFgCtx.ZERO);

    this.glFgCtx.useProgram(this.fgProgram);

    // Set up background-layer shaders and program

    this.bgProgram = <WebGLProgram>this.glBgCtx.createProgram();
    this.setupProgram(this.glBgCtx, GlShaders.vertexShaderBgSrc, GlShaders.fragmentShaderBgSrc, this.bgProgram);

    // Get all attribute locations

    this.fgVertexAttributeLocation = this.glFgCtx.getAttribLocation(this.fgProgram, 'aVertex');
    this.fgTextureAttributeLocation = this.glFgCtx.getAttribLocation(this.fgProgram, 'aUV');
    this.fgColorAttributeLocation = this.glFgCtx.getAttribLocation(this.fgProgram, 'fragColor');
    this.fgCentreAttributeLocation = this.glFgCtx.getAttribLocation(this.fgProgram, 'cVertex');
    this.fgRotationAttributeLocation = this.glFgCtx.getAttribLocation(this.fgProgram, 'rotation');

    this.bgVertexAttributeLocation = this.glBgCtx.getAttribLocation(this.bgProgram, 'aVertex');
    this.bgColorAttributeLocation = this.glBgCtx.getAttribLocation(this.bgProgram, 'fragColor');

    // Set all unchanging uniforms

    this.glFgCtx.uniform1f(this.glFgCtx.getUniformLocation(this.fgProgram, 'canvas_w'), this.terminal.canvasWidth);
    this.glFgCtx.uniform1f(this.glFgCtx.getUniformLocation(this.fgProgram, 'canvas_h'), this.terminal.canvasHeight);
    this.glBgCtx.uniform1f(this.glBgCtx.getUniformLocation(this.bgProgram, 'canvas_w'), this.terminal.canvasWidth);
    this.glBgCtx.uniform1f(this.glBgCtx.getUniformLocation(this.bgProgram, 'canvas_h'), this.terminal.canvasHeight);
  }

  private initialiseData(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        let index = (i * this.FLOATS_PER_QUAD) + (j * this.terminal.w * this.FLOATS_PER_QUAD);
        this.terminalCellVertices.set(this.cacheCellVertices(i, j), index);
        this.centrePointCoordinates.set(this.cacheCellCentre(i, j), index);
        this.textureVertices.set(this.characterCache.getCharacterVertices('?'), index);
        this.fgColorValues.set(new Float32Array([
          1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0
        ]), index * 2);
        this.bgColorValues.set(new Float32Array([
          1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0
        ]), index * 2);
        this.rotationValues.set(new Float32Array([
          0, 0, 0, 0, 0, 0
        ]), index / 2);
      }
    }

    // Buffer all data that will not change over time (vertices that define the quads to draw each cell, and the vertex
    // that defines each cell's central point).
    this.bufferArray(this.glFgCtx, this.terminalCellVertices, this.fgVertexBuffer);
    this.bufferArray(this.glFgCtx, this.centrePointCoordinates, this.fgVertexCentreBuffer);
    this.bufferArray(this.glBgCtx, this.terminalCellVertices, this.bgVertexBuffer);
  }

  // Enables a vertex attribute array, binds a buffer, optionally binds a texture if drawing a textured quad, and... I
  // honestly don't know enough about how WebGL works to write a coherent comment here explaining what is happening
  private enableVertexArray(glCtx: WebGLRenderingContext, attribPtr: number, buffer: WebGLBuffer, step: number, texture?: WebGLTexture): void {
    glCtx.enableVertexAttribArray(attribPtr);
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buffer);
    if (texture) {
      glCtx.bindTexture(glCtx.TEXTURE_2D, texture);
    }
    glCtx.vertexAttribPointer(attribPtr, step, glCtx.FLOAT, false, 0, 0);
  }

  private bufferArray(glCtx: WebGLRenderingContext, data: Float32Array, buffer: WebGLBuffer, arrayType?: number): void {
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buffer);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, data, (arrayType ? arrayType : glCtx.STATIC_DRAW));
  }

  private cacheCellVertices(x: number, y: number): Float32Array {
    let worldSpaceX = x * this.terminal.cellPixelWidth;
    let worldSpaceY = y * this.terminal.cellPixelHeight;

    return new Float32Array([
      worldSpaceX, worldSpaceY,
      worldSpaceX + this.terminal.cellPixelWidth, worldSpaceY,
      worldSpaceX + this.terminal.cellPixelWidth, worldSpaceY + this.terminal.cellPixelHeight,
      worldSpaceX, worldSpaceY,
      worldSpaceX, worldSpaceY + this.terminal.cellPixelHeight,
      worldSpaceX + this.terminal.cellPixelWidth, worldSpaceY + this.terminal.cellPixelHeight,
    ]);
  }

  private cacheCellCentre(x: number, y: number): Float32Array {
    let worldSpaceX = x * this.terminal.cellPixelWidth;
    let worldSpaceY = y * this.terminal.cellPixelHeight;

    // There has to be a less stupid way than this
    return new Float32Array([
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2,
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2,
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2,
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2,
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2,
      worldSpaceX + this.terminal.cellPixelWidth / 2, worldSpaceY + this.terminal.cellPixelHeight / 2
    ]);
  }

  /**
   * Writes data for a foreground character into the appropriate arrays that at draw time will be passed to WebGL
   * for rendering.
   */
  public setForegroundData(x: number, y: number, char: string, r: number, g: number, b: number, rot: number): any {
    const index = (y * this.terminal.w * this.FLOATS_PER_QUAD) + (x * this.FLOATS_PER_QUAD);
    const fgcIndex = index * 2;
    const rotationIndex = index / 2;

    this.textureVertices.set(this.characterCache.getCharacterVertices(char), index);

    for (let i = 0; i < 24; i += 4) {
      this.fgColorValues[fgcIndex + i + 0] = r;
      this.fgColorValues[fgcIndex + i + 1] = g;
      this.fgColorValues[fgcIndex + i + 2] = b;
    }
    for (let j = 0; j !== 6; ++j) {
      this.rotationValues[rotationIndex + j] = rot;
    }
  }

  /**
   * Writes data for a background quad into the appropriate arrays that at draw time will be passed to WebGL
   * for rendering.
   */
  public setBackgroundData(x: number, y: number, r: number, g: number, b: number): any {
    const bgcIndex = (y * this.terminal.w * this.FLOATS_PER_QUAD * 2) + (x * this.FLOATS_PER_QUAD * 2);

    for (let i = 0; i < 24; i += 4) {
      this.bgColorValues[bgcIndex + i + 0] = r;
      this.bgColorValues[bgcIndex + i + 1] = g;
      this.bgColorValues[bgcIndex + i + 2] = b;
    }
  }

  public draw(): void {
    // Check if the texture needs updating - if the terminal has encountered a new character that it has not rendered before then it will
    // have added it to the texture atlas, and the foreground Ctx will need to pull new texture information out.
    if (this.characterCache.textureNeedsUpdatingFlag) {
      this.characterCache.textureNeedsUpdatingFlag = false;
      this.readTextureFromCharacterCacheCanvas();
    }

    // Buffer all foreground data that changes frame-by-frame and draw to the foreground canvas.
    this.bufferArray(this.glFgCtx, this.textureVertices, this.fgTextureBuffer);
    this.bufferArray(this.glFgCtx, this.rotationValues, this.fgRotationBuffer);
    this.bufferArray(this.glFgCtx, this.fgColorValues, this.fgcBuffer);

    this.enableVertexArray(this.glFgCtx, this.fgVertexAttributeLocation, this.fgVertexBuffer, 2);
    this.enableVertexArray(this.glFgCtx, this.fgCentreAttributeLocation, this.fgVertexCentreBuffer, 2);
    this.enableVertexArray(this.glFgCtx, this.fgRotationAttributeLocation, this.fgRotationBuffer, 1);
    this.enableVertexArray(this.glFgCtx, this.fgColorAttributeLocation, this.fgcBuffer, 4);
    this.enableVertexArray(this.glFgCtx, this.fgTextureAttributeLocation, this.fgTextureBuffer, 2, this.textureAtlas);

    this.glFgCtx.drawArrays(this.glFgCtx.TRIANGLES, 0, this.terminalCellVertices.length / 2);

    // Buffer all background data that changes frame-by-frame and draw to the background canvas.
    this.bufferArray(this.glBgCtx, this.bgColorValues, this.bgcBuffer);

    this.enableVertexArray(this.glBgCtx, this.bgVertexAttributeLocation, this.bgVertexBuffer, 2);
    this.enableVertexArray(this.glBgCtx, this.bgColorAttributeLocation, this.bgcBuffer, 4);

    this.glBgCtx.drawArrays(this.glBgCtx.TRIANGLES, 0, this.terminalCellVertices.length / 2);
  }
}
