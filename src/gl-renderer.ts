import { TextCache } from './text-cache';
import { NRXTerm } from './terminal';
import { GlShaders } from './gl-shaders';

export class GLRenderer {
  private terminal: NRXTerm;
  private textCache: TextCache;
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
  private textureAtlas: WebGLTexture;

  private fgVertexBuffer: WebGLBuffer;
  private fgVertexCentreBuffer: WebGLBuffer;
  private fgRotationBuffer: WebGLBuffer;
  private bgVertexBuffer: WebGLBuffer;
  private textureBuffer: WebGLBuffer;
  private fgcBuffer: WebGLBuffer;
  private bgcBuffer: WebGLBuffer;

  private tsize: number;
  private verts: Float32Array;
  private centres: Float32Array;
  private rotations: Float32Array;
  private clips: Float32Array;
  private fgcs: Float32Array;
  private bgcs: Float32Array;

  private _r = 0.01;

  private readonly FLOATS_PER_QUAD = 12;

  constructor(terminal: NRXTerm, textCache: TextCache, glFgContext: WebGLRenderingContext, glBgContext: WebGLRenderingContext) {
    this.terminal = terminal;
    this.textCache = textCache;
    this.glFgContext = glFgContext;
    this.glBgContext = glBgContext;
    this.setupShaders();

    this.tsize = this.terminal.w * this.terminal.h * this.FLOATS_PER_QUAD;
    this.verts = new Float32Array(this.tsize);
    this.centres = new Float32Array(this.tsize);
    this.rotations = new Float32Array(this.tsize / 2);
    this.clips = new Float32Array(this.tsize);
    this.fgcs = new Float32Array(this.tsize * 2);
    this.bgcs = new Float32Array(this.tsize * 2);

    this.fgVertexBuffer = this.glFgContext.createBuffer();
    this.fgVertexCentreBuffer = this.glFgContext.createBuffer();
    this.fgRotationBuffer = this.glFgContext.createBuffer();
    this.bgVertexBuffer = this.glBgContext.createBuffer();
    this.textureBuffer = this.glFgContext.createBuffer();
    this.fgcBuffer = this.glFgContext.createBuffer();
    this.bgcBuffer = this.glBgContext.createBuffer();

    this.firstRunSetup();
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

    this.textureAtlas = <WebGLTexture> this.glFgContext.createTexture();
    this.glFgContext.bindTexture(this.glFgContext.TEXTURE_2D, this.textureAtlas);
    this.glFgContext.pixelStorei(this.glFgContext.UNPACK_FLIP_Y_WEBGL, 1);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MIN_FILTER, this.glFgContext.LINEAR);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MAG_FILTER, this.glFgContext.LINEAR);
    this.glFgContext.texImage2D(this.glFgContext.TEXTURE_2D, 0, this.glFgContext.RGBA, this.glFgContext.RGBA, this.glFgContext.UNSIGNED_BYTE, this.textCache.canvas);

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

    console.log('WebGL Rendering contexts set up correctly and texture loaded from text canvas.');
  }

  public firstRunSetup(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        let index = (i * this.FLOATS_PER_QUAD) + (j * this.terminal.w * this.FLOATS_PER_QUAD);
        this.verts.set(this.cacheTileVertices(i, j), index);
        this.centres.set(this.cacheTileCentre(i, j), index);
        this.clips.set(this.textCache.getCharacterVertices('?'), index);
        this.fgcs.set(new Float32Array([
          1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0
        ]), index * 2);
        this.bgcs.set(new Float32Array([
          1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0
        ]), index * 2);
        this.rotations.set(new Float32Array([
          0, 0, 0, 0, 0, 0
        ]), index / 2);
      }
    }

    // Buffer all data that will not change over time (vertexes for the quads to draw each cell, and the vertex
    // that define their central points).
    this.bindAndBuffer(this.glFgContext, this.verts, this.fgVertexBuffer);
    this.bindAndBuffer(this.glFgContext, this.centres, this.fgVertexCentreBuffer);
    this.bindAndBuffer(this.glBgContext, this.verts, this.bgVertexBuffer);
  }

  public pushForegroundData(i: number, j: number, char: string, r: number, g: number, b: number, rot: number): any {
    let index = (j * this.terminal.w * this.FLOATS_PER_QUAD) + (i * this.FLOATS_PER_QUAD);
    let fgcIndex = index * 2;
    let rotationIndex = index / 2;
    this.clips.set(this.textCache.getCharacterVertices(char), index);
    // this.rotations.set(rot, index);
    for (let n = 0; n < 24; n += 4) {
      this.fgcs[fgcIndex + n + 0] = r;
      this.fgcs[fgcIndex + n + 1] = g;
      this.fgcs[fgcIndex + n + 2] = b;
    }
    for (let k = 0; k !== 6; ++k) {
      this.rotations[rotationIndex + k] = rot;
    }
  }

  public pushBackgroundData(i: number, j: number, r: number, g: number, b: number): any {
    let bgcIndex = (j * this.terminal.w * this.FLOATS_PER_QUAD) + (i * this.FLOATS_PER_QUAD);
    bgcIndex *= 2;
    for (let n = 0; n < 24; n += 4) {
      this.bgcs[bgcIndex + n + 0] = r;
      this.bgcs[bgcIndex + n + 1] = g;
      this.bgcs[bgcIndex + n + 2] = b;
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

  public bindAndBuffer(glContext: WebGLRenderingContext, data: Float32Array, buffer: WebGLBuffer, arrayType?: number): void {
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, data, (arrayType ? arrayType : glContext.STATIC_DRAW));
  }

  public draw(): void {
    // Clear the foreground canvas. TODO: I guess this is not necessary?
    // this.glFgContext.scissor(0, 0, this.terminal.glFgCtx.canvas.width, this.terminal.glFgCtx.canvas.height);
    // this.glFgContext.clearColor(0, 0, 0, 0);
    // this.glFgContext.clear(this.glFgContext.COLOR_BUFFER_BIT);

    // Buffer all foreground data that changes frame-by-frame and draw to the foreground canvas.
    this.bindAndBuffer(this.glFgContext, this.clips, this.textureBuffer);
    this.bindAndBuffer(this.glFgContext, this.rotations, this.fgRotationBuffer);
    this.bindAndBuffer(this.glFgContext, this.fgcs, this.fgcBuffer);

    this.enableVertexArray(this.glFgContext, this.fgVertexAttributeLocation, this.fgVertexBuffer, 2);
    this.enableVertexArray(this.glFgContext, this.fgCentreAttributeLocation, this.fgVertexCentreBuffer, 2);
    this.enableVertexArray(this.glFgContext, this.fgRotationAttributeLocation, this.fgRotationBuffer, 1);
    this.enableVertexArray(this.glFgContext, this.fgColorAttributeLocation, this.fgcBuffer, 4);
    this.enableVertexArray(this.glFgContext, this.fgTextureAttributeLocation, this.textureBuffer, 2, this.textureAtlas);

    this.glFgContext.drawArrays(this.glFgContext.TRIANGLES, 0, this.verts.length / 2);

    // Buffer all background data that changes frame-by-frame and draw to the background canvas.
    this.bindAndBuffer(this.glBgContext, this.bgcs, this.bgcBuffer);

    this.enableVertexArray(this.glBgContext, this.bgVertexAttributeLocation, this.bgVertexBuffer, 2);
    this.enableVertexArray(this.glBgContext, this.bgColorAttributeLocation, this.bgcBuffer, 4);

    this.glBgContext.drawArrays(this.glBgContext.TRIANGLES, 0, this.verts.length / 2);
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
