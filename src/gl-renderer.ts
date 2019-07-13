import { CharacterCache } from './character-cache';
import { NRXTerm } from './terminal';
import { GlShaders } from './gl-shaders';

export class GLRenderer {
  private terminal: NRXTerm;
  private characterCache: CharacterCache;
  private textureAtlas: WebGLTexture;

  private glFgContext: WebGLRenderingContext;
  private glBgContext: WebGLRenderingContext;

  private textureProgram: WebGLProgram;
  private rectProgram: WebGLProgram;

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

  private terminalTileVertices: Float32Array;
  private centrePointCoordinates: Float32Array;
  private rotationValues: Float32Array;
  private textureVertices: Float32Array;
  private fgColorValues: Float32Array;
  private bgColorValues: Float32Array;

  private readonly FLOATS_PER_QUAD = 12;

  constructor(terminal: NRXTerm, textCache: CharacterCache, glFgContext: WebGLRenderingContext, glBgContext: WebGLRenderingContext) {
    this.terminal = terminal;
    this.characterCache = textCache;
    this.glFgContext = glFgContext;
    this.glBgContext = glBgContext;
    this.setupShaders();

    const totalNumberOfPoints = this.terminal.w * this.terminal.h * this.FLOATS_PER_QUAD;

    this.terminalTileVertices =   new Float32Array(totalNumberOfPoints);
    this.centrePointCoordinates = new Float32Array(totalNumberOfPoints);
    this.rotationValues =         new Float32Array(totalNumberOfPoints / 2);
    this.textureVertices =        new Float32Array(totalNumberOfPoints);
    this.fgColorValues =          new Float32Array(totalNumberOfPoints * 2);
    this.bgColorValues =          new Float32Array(totalNumberOfPoints * 2);

    this.fgVertexBuffer =         this.glFgContext.createBuffer();
    this.fgVertexCentreBuffer =   this.glFgContext.createBuffer();
    this.fgRotationBuffer =       this.glFgContext.createBuffer();
    this.fgTextureBuffer =        this.glFgContext.createBuffer();
    this.fgcBuffer =              this.glFgContext.createBuffer();

    this.bgVertexBuffer =         this.glBgContext.createBuffer();
    this.bgcBuffer =              this.glBgContext.createBuffer();

    this.initialise();
  }

  private readTextureFromCharacterCacheCanvas(): void {
    this.textureAtlas = <WebGLTexture> this.glFgContext.createTexture();
    this.glFgContext.bindTexture(this.glFgContext.TEXTURE_2D, this.textureAtlas);
    this.glFgContext.pixelStorei(this.glFgContext.UNPACK_FLIP_Y_WEBGL, 1);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MIN_FILTER, this.glFgContext.LINEAR);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MAG_FILTER, this.glFgContext.LINEAR);
    this.glFgContext.texImage2D(this.glFgContext.TEXTURE_2D, 0, this.glFgContext.RGBA, this.glFgContext.RGBA, this.glFgContext.UNSIGNED_BYTE, this.characterCache.canvas);
  }

  private setupShaders(): void {

    // Set up foreground-layer shaders, font cache, etc

    let vertShaderObj = this.glFgContext.createShader(this.glFgContext.VERTEX_SHADER);
    let fragShaderObj = this.glFgContext.createShader(this.glFgContext.FRAGMENT_SHADER);
    this.glFgContext.shaderSource(vertShaderObj, GlShaders.vertexShaderFgSrc);
    this.glFgContext.shaderSource(fragShaderObj, GlShaders.fragmentShaderFgSrc);
    this.glFgContext.compileShader(vertShaderObj);
    this.glFgContext.compileShader(fragShaderObj);

    this.textureProgram = <WebGLProgram> this.glFgContext.createProgram();
    this.glFgContext.attachShader(this.textureProgram, vertShaderObj);
    this.glFgContext.attachShader(this.textureProgram, fragShaderObj);
    this.glFgContext.linkProgram(this.textureProgram);
    this.glFgContext.useProgram(this.textureProgram);

    let vertRectShaderObj = this.glFgContext.createShader(this.glFgContext.VERTEX_SHADER);
    let fragRectShaderObj = this.glFgContext.createShader(this.glFgContext.FRAGMENT_SHADER);
    this.glFgContext.shaderSource(vertRectShaderObj, GlShaders.vertexShaderBgSrc);
    this.glFgContext.shaderSource(fragRectShaderObj, GlShaders.fragmentShaderBgSrc);
    this.glFgContext.compileShader(vertRectShaderObj);
    this.glFgContext.compileShader(fragRectShaderObj);

    this.readTextureFromCharacterCacheCanvas();

    this.glFgContext.enable(this.glFgContext.BLEND);
    this.glFgContext.blendFunc(this.glFgContext.CONSTANT_COLOR, this.glFgContext.SRC_ALPHA);
    this.glFgContext.blendFuncSeparate(this.glFgContext.SRC_ALPHA, this.glFgContext.ONE_MINUS_SRC_ALPHA, this.glFgContext.ONE, this.glFgContext.ZERO);

    this.glFgContext.useProgram(this.textureProgram);

    // Set up background-layer shaders

    let vertShaderObjBg = this.glBgContext.createShader(this.glBgContext.VERTEX_SHADER);
    let fragShaderObjBg = this.glBgContext.createShader(this.glBgContext.FRAGMENT_SHADER);
    this.glBgContext.shaderSource(vertShaderObjBg, GlShaders.vertexShaderBgSrc);
    this.glBgContext.shaderSource(fragShaderObjBg, GlShaders.fragmentShaderBgSrc);
    this.glBgContext.compileShader(vertShaderObjBg);
    this.glBgContext.compileShader(fragShaderObjBg);

    this.rectProgram = <WebGLProgram> this.glBgContext.createProgram();
    this.glBgContext.attachShader(this.rectProgram, vertShaderObjBg);
    this.glBgContext.attachShader(this.rectProgram, fragShaderObjBg);
    this.glBgContext.linkProgram(this.rectProgram);
    this.glBgContext.useProgram(this.rectProgram);

    // Get attribute locations

    this.fgVertexAttributeLocation = this.glFgContext.getAttribLocation(this.textureProgram, 'aVertex');
    this.fgTextureAttributeLocation = this.glFgContext.getAttribLocation(this.textureProgram, 'aUV');
    this.fgColorAttributeLocation = this.glFgContext.getAttribLocation(this.textureProgram, 'fragColor');
    this.fgCentreAttributeLocation = this.glFgContext.getAttribLocation(this.textureProgram, 'cVertex');
    this.fgRotationAttributeLocation = this.glFgContext.getAttribLocation(this.textureProgram, 'rotation');

    this.bgVertexAttributeLocation = this.glBgContext.getAttribLocation(this.rectProgram, 'aVertex');
    this.bgColorAttributeLocation = this.glBgContext.getAttribLocation(this.rectProgram, 'fragColor');
    
    // Set unchanging uniforms

    this.glFgContext.uniform1f(this.glFgContext.getUniformLocation(this.textureProgram, 'world_w'), this.terminal.glFgCtx.canvas.width);
    this.glFgContext.uniform1f(this.glFgContext.getUniformLocation(this.textureProgram, 'world_h'), this.terminal.glFgCtx.canvas.height);
    this.glBgContext.uniform1f(this.glBgContext.getUniformLocation(this.rectProgram, 'world_w'), this.terminal.glBgCtx.canvas.width);
    this.glBgContext.uniform1f(this.glBgContext.getUniformLocation(this.rectProgram, 'world_h'), this.terminal.glBgCtx.canvas.height);
  }

  public initialise(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        let index = (i * this.FLOATS_PER_QUAD) + (j * this.terminal.w * this.FLOATS_PER_QUAD);
        this.terminalTileVertices.set(this.cacheTileVertices(i, j), index);
        this.centrePointCoordinates.set(this.cacheTileCentre(i, j), index);
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

    // Buffer all data that will not change over time (vertices that define the quads to draw each tile, and the vertex
    // that defines each tile's central point).
    this.bufferArray(this.glFgContext, this.terminalTileVertices, this.fgVertexBuffer);
    this.bufferArray(this.glFgContext, this.centrePointCoordinates, this.fgVertexCentreBuffer);
    this.bufferArray(this.glBgContext, this.terminalTileVertices, this.bgVertexBuffer);
  }

  public pushForegroundData(i: number, j: number, char: string, r: number, g: number, b: number, rot: number): any {
    let index = (j * this.terminal.w * this.FLOATS_PER_QUAD) + (i * this.FLOATS_PER_QUAD);
    let fgcIndex = index * 2;
    let rotationIndex = index / 2;
    this.textureVertices.set(this.characterCache.getCharacterVertices(char), index);
    // this.rotations.set(rot, index);
    for (let n = 0; n < 24; n += 4) {
      this.fgColorValues[fgcIndex + n + 0] = r;
      this.fgColorValues[fgcIndex + n + 1] = g;
      this.fgColorValues[fgcIndex + n + 2] = b;
    }
    for (let k = 0; k !== 6; ++k) {
      this.rotationValues[rotationIndex + k] = rot;
    }
  }

  public pushBackgroundData(i: number, j: number, r: number, g: number, b: number): any {
    let bgcIndex = (j * this.terminal.w * this.FLOATS_PER_QUAD) + (i * this.FLOATS_PER_QUAD);
    bgcIndex *= 2;
    for (let n = 0; n < 24; n += 4) {
      this.bgColorValues[bgcIndex + n + 0] = r;
      this.bgColorValues[bgcIndex + n + 1] = g;
      this.bgColorValues[bgcIndex + n + 2] = b;
    }
  }

  // Enables a vertex attribute array, binds a buffer, optionally binds a texture if drawing a textured quad, and... I
  // honestly don't know enough about how WebGL works to write a coherent comment here explaining what is happening
  public enableVertexArray(glContext: WebGLRenderingContext, attribPointer: number, buffer: WebGLBuffer, step: number, texture?: WebGLTexture): void {
    glContext.enableVertexAttribArray(attribPointer);
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    if (texture) {
      glContext.bindTexture(glContext.TEXTURE_2D, texture);
    }
    glContext.vertexAttribPointer(attribPointer, step, glContext.FLOAT, false, 0, 0);
  }

  public bufferArray(glContext: WebGLRenderingContext, data: Float32Array, buffer: WebGLBuffer, arrayType?: number): void {
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, data, (arrayType ? arrayType : glContext.STATIC_DRAW));
  }

  public draw(): void {
    // Check if the texture needs updating - if the terminal has encountered a new character that it has not rendered before (and which
    // the user didn't tell us about in advance...) then it will have added it to the texture atlas, and the foreground context will need
    // to pull new texture information out.
    if (this.characterCache.textureNeedsUpdatingFlag) {
      this.characterCache.textureNeedsUpdatingFlag = false;
      this.readTextureFromCharacterCacheCanvas();
    }

    // Buffer all foreground data that changes frame-by-frame and draw to the foreground canvas.
    this.bufferArray(this.glFgContext, this.textureVertices, this.fgTextureBuffer);
    this.bufferArray(this.glFgContext, this.rotationValues, this.fgRotationBuffer);
    this.bufferArray(this.glFgContext, this.fgColorValues, this.fgcBuffer);

    this.enableVertexArray(this.glFgContext, this.fgVertexAttributeLocation, this.fgVertexBuffer, 2);
    this.enableVertexArray(this.glFgContext, this.fgCentreAttributeLocation, this.fgVertexCentreBuffer, 2);
    this.enableVertexArray(this.glFgContext, this.fgRotationAttributeLocation, this.fgRotationBuffer, 1);
    this.enableVertexArray(this.glFgContext, this.fgColorAttributeLocation, this.fgcBuffer, 4);
    this.enableVertexArray(this.glFgContext, this.fgTextureAttributeLocation, this.fgTextureBuffer, 2, this.textureAtlas);

    this.glFgContext.drawArrays(this.glFgContext.TRIANGLES, 0, this.terminalTileVertices.length / 2);

    // Buffer all background data that changes frame-by-frame and draw to the background canvas.
    this.bufferArray(this.glBgContext, this.bgColorValues, this.bgcBuffer);

    this.enableVertexArray(this.glBgContext, this.bgVertexAttributeLocation, this.bgVertexBuffer, 2);
    this.enableVertexArray(this.glBgContext, this.bgColorAttributeLocation, this.bgcBuffer, 4);

    this.glBgContext.drawArrays(this.glBgContext.TRIANGLES, 0, this.terminalTileVertices.length / 2);
  }

  public cacheTileVertices(x: number, y: number): Float32Array {
    let worldSpaceX = x * this.terminal.tileWidth;
    let worldSpaceY = y * this.terminal.tileHeight;

    return new Float32Array([
      worldSpaceX, worldSpaceY,
      worldSpaceX + this.terminal.tileWidth, worldSpaceY,
      worldSpaceX + this.terminal.tileWidth, worldSpaceY + this.terminal.tileHeight,
      worldSpaceX, worldSpaceY,
      worldSpaceX, worldSpaceY + this.terminal.tileHeight,
      worldSpaceX + this.terminal.tileWidth, worldSpaceY + this.terminal.tileHeight,
    ]);
  }

  public cacheTileCentre(x: number, y: number): Float32Array {
    let worldSpaceX = x * this.terminal.tileWidth;
    let worldSpaceY = y * this.terminal.tileHeight;

    return new Float32Array([
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2,
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2,
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2,
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2,
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2,
      worldSpaceX + this.terminal.tileWidth / 2, worldSpaceY + this.terminal.tileHeight / 2
    ]);
  }
}
