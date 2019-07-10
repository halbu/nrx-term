import { TextCache } from './text-cache';
import { NRXTerm } from './terminal';

export class GLRenderer {
  private terminal: NRXTerm;
  private textCache: TextCache;
  private glContext: WebGLRenderingContext;
  private textureProgram: WebGLProgram;
  private rectProgram: WebGLProgram;
  private vloc: number;
  private tloc: number;
  private cloc: number;
  private textureAtlas: WebGLTexture;

  private vertexBuffer: WebGLBuffer;
  private textureBuffer: WebGLBuffer;
  private fgcBuffer: WebGLBuffer;
  private bgcBuffer: WebGLBuffer;

  private tsize: number;
  private verts: Float32Array;
  private clips: Float32Array;
  private fgcs: Float32Array;
  private bgcs: Float32Array;

  private readonly POINTS_PER_QUAD = 12;

  // create shaders
  private vertexShaderSrc =
    'attribute vec2 aVertex;' +
    'attribute vec2 aUV;' +
    'attribute vec4 fragColor;' +
    'varying vec2 vTex;' +
    'varying vec4 fCol;' +
    'void main(void) {' +
    '  gl_Position = vec4(aVertex, 0.0, 1.0);' +
    '  vTex = aUV;' +
    '  fCol = fragColor;' +
    '}';

  private fragmentShaderSrc =
    'precision highp float;' +
    'varying vec2 vTex;' +
    'varying vec4 fCol;' +
    'uniform sampler2D sampler0;' +
    'void main(void){' +
    //"  gl_FragColor = fCol + texture2D(sampler0, vTex);" +
    '  gl_FragColor = fCol + texture2D(sampler0, vTex);' +
    '}';

  // create shaders
  private vertexRectShaderSrc =
    'attribute vec2 aVertex;' +
    'attribute vec4 fragColor;' +
    'varying vec4 fCol;' +
    'void main(void) {' +
    '  gl_Position = vec4(aVertex, 0.0, 1.0);' +
    '  fCol = fragColor;' +
    '}';

  private fragmentRectShaderSrc =
    'precision highp float;' +
    'varying vec4 fCol;' +
    'void main(void) {' +
    '  gl_FragColor = fCol;' +
    '}';

  constructor(terminal: NRXTerm, textCache: TextCache, glContext: WebGLRenderingContext) {
    this.terminal = terminal;
    this.textCache = textCache;
    this.glContext = glContext;
    this.setupShaders();

    this.tsize = this.terminal.w * this.terminal.h * this.POINTS_PER_QUAD;
    this.verts = new Float32Array(this.tsize);
    this.clips = new Float32Array(this.tsize);
    this.fgcs = new Float32Array(this.tsize * 2);
    this.bgcs = new Float32Array(this.tsize * 2);

    this.vertexBuffer = this.glContext.createBuffer();
    this.textureBuffer = this.glContext.createBuffer();
    this.fgcBuffer = this.glContext.createBuffer();
    this.bgcBuffer = this.glContext.createBuffer();

    this.firstRunSetup();
  }

  private setupShaders(): void {
    let vertShaderObj = this.glContext.createShader(this.glContext.VERTEX_SHADER);
    let fragShaderObj = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
    this.glContext.shaderSource(vertShaderObj, this.vertexShaderSrc);
    this.glContext.shaderSource(fragShaderObj, this.fragmentShaderSrc);
    this.glContext.compileShader(vertShaderObj);
    this.glContext.compileShader(fragShaderObj);

    this.textureProgram = <WebGLProgram> this.glContext.createProgram();
    this.glContext.attachShader(this.textureProgram, vertShaderObj);
    this.glContext.attachShader(this.textureProgram, fragShaderObj);
    this.glContext.linkProgram(this.textureProgram);
    this.glContext.useProgram(this.textureProgram);

    let vertRectShaderObj = this.glContext.createShader(this.glContext.VERTEX_SHADER);
    let fragRectShaderObj = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
    this.glContext.shaderSource(vertRectShaderObj, this.vertexRectShaderSrc);
    this.glContext.shaderSource(fragRectShaderObj, this.fragmentRectShaderSrc);
    this.glContext.compileShader(vertRectShaderObj);
    this.glContext.compileShader(fragRectShaderObj);

    this.rectProgram = <WebGLProgram> this.glContext.createProgram();
    this.glContext.attachShader(this.rectProgram, vertShaderObj);
    this.glContext.attachShader(this.rectProgram, fragShaderObj);
    this.glContext.linkProgram(this.rectProgram);
    this.glContext.useProgram(this.rectProgram);

    this.vloc = this.glContext.getAttribLocation(this.textureProgram, 'aVertex');
    this.tloc = this.glContext.getAttribLocation(this.textureProgram, 'aUV');
    this.cloc = this.glContext.getAttribLocation(this.textureProgram, 'fragColor');

    this.glContext.viewport(0, 0, this.terminal.glCtx.canvas.width, this.terminal.glCtx.canvas.height);

    this.textureAtlas = <WebGLTexture> this.glContext.createTexture();
    this.glContext.bindTexture(this.glContext.TEXTURE_2D, this.textureAtlas);
    this.glContext.pixelStorei(this.glContext.UNPACK_FLIP_Y_WEBGL, 1);
    let gl = this.glContext;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.glContext.texImage2D(this.glContext.TEXTURE_2D, 0, this.glContext.RGBA, this.glContext.RGBA, this.glContext.UNSIGNED_BYTE, this.textCache.canvas);

    this.glContext.enable(this.glContext.BLEND);
    this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE_MINUS_SRC_ALPHA);

    console.log('WebGL Rendering context set up correctly and texture loaded from text canvas.');
  }

  public switchProgram(str: string): void {
    if (str === 'BACKGROUND') {
      this.glContext.useProgram(this.rectProgram);
    } else if (str === 'FOREGROUND') {
      this.glContext.useProgram(this.textureProgram);
    }
  }

  public firstRunSetup(): void {
    for (let i = 0; i !== this.terminal.w; ++i) {
      for (let j = 0; j !== this.terminal.h; ++j) {
        let index = (i * this.POINTS_PER_QUAD) + (j * this.terminal.w * this.POINTS_PER_QUAD);
        this.verts.set(this.getverts(i, j), index);
        this.clips.set(this.textCache.getCharacterVertices('?'), index);
        let r = 1;
        let g = 0;
        let b = 1;
        this.fgcs.set(new Float32Array([
          r, g, b, 0,
          r, g, b, 0,
          r, g, b, 0,
          r, g, b, 0,
          r, g, b, 0,
          r, g, b, 0,
        ]), index * 2);
      }
    }
  }

  public bindAndBuffer(data: Float32Array, buffer: WebGLBuffer, arrayType?: number): void {
    this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, buffer);
    this.glContext.bufferData(this.glContext.ARRAY_BUFFER, data, (arrayType ? arrayType : this.glContext.STATIC_DRAW));
  }

  // Enables a vertex attribute array, binds a buffer, optionally binds a texture if drawing a textured quad, and... I
  // honestly don't know enough about how WebGL works to write a coherent comment here explaining what is happening
  public enableVertexArray(attribPointer: number, buffer: WebGLBuffer, step: number, texture?: WebGLTexture): void {
    this.glContext.enableVertexAttribArray(attribPointer);
    this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, buffer);
    if (texture) {
      this.glContext.bindTexture(this.glContext.TEXTURE_2D, texture);
    }
    this.glContext.vertexAttribPointer(attribPointer, step, this.glContext.FLOAT, false, 0, 0);
  }

  public pushclips(i: number, j: number, char: string, r: number, g: number, b: number): any {
    let index = (j * this.terminal.w * this.POINTS_PER_QUAD) + (i * this.POINTS_PER_QUAD);
    let fgcIndex = index * 2;
    this.clips.set(this.textCache.getCharacterVertices(char), index);
    for (let n = 0; n < 24; n += 4) {
      this.fgcs[fgcIndex + n + 0] = r;
      this.fgcs[fgcIndex + n + 1] = g;
      this.fgcs[fgcIndex + n + 2] = b;
    }
  }

  public draw(): void {
    // this.switchProgram('FOREGROUND');
    
    // this.glContext.scissor(0, 0, this.terminal.glCtx.canvas.width, this.terminal.glCtx.canvas.height);
    // this.glContext.clearColor(0, 0, 0, 0);
    // this.glContext.clear(this.glContext.COLOR_BUFFER_BIT);

    this.bindAndBuffer(this.verts, this.vertexBuffer);
    // this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.vertexBuffer);
    this.bindAndBuffer(this.fgcs, this.fgcBuffer);
    this.bindAndBuffer(this.clips, this.textureBuffer);

    this.enableVertexArray(this.vloc, this.vertexBuffer, 2);
    this.enableVertexArray(this.cloc, this.fgcBuffer, 4);
    this.enableVertexArray(this.tloc, this.textureBuffer, 2, this.textureAtlas);

    this.glContext.drawArrays(this.glContext.TRIANGLES, 0, this.verts.length / 2);
  }

  public getverts(x: number, y: number): Float32Array {
    let normalizedX = 2 * ((x - 0) / (this.terminal.w - 0)) - 1;
    let normalizedY = -(2 * ((y - 0) / (this.terminal.h - 0)) - 1);
    let w = (2 / this.terminal.w);
    let h = (2 / this.terminal.h);

    return new Float32Array([
      normalizedX, normalizedY,
      normalizedX + w, normalizedY,
      normalizedX + w, normalizedY - h,
      normalizedX, normalizedY,
      normalizedX, normalizedY - h,
      normalizedX + w, normalizedY - h,
    ]);
  }
}
