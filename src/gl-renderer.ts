import { TextCache } from './text-cache';
import { NRXTerm } from './terminal';

export class GLRenderer {
  private terminal: NRXTerm;
  private textCache: TextCache;
  private glFgContext: WebGLRenderingContext;
  private glBgContext: WebGLRenderingContext;
  private textureProgram: WebGLProgram;
  private rectProgram: WebGLProgram;
  private vloc: number;
  private tloc: number;
  private cloc: number;
  private rloc: WebGLUniformLocation;
  private mloc: WebGLUniformLocation;
  private ploc: WebGLUniformLocation;
  private bgvloc: number;
  private bgcloc: number;
  private textureAtlas: WebGLTexture;

  private fgVertexBuffer: WebGLBuffer;
  private bgVertexBuffer: WebGLBuffer;
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
    'uniform vec2 u_rotation;' +
    'uniform mat3 m_rotation;' +
    'uniform mat3 m_projection;' +
    'void main(void) {' +
    // '  vec2 rotatedPosition = vec2(aVertex.x + u_rotation.x, aVertex.y + u_rotation.y);' +
    // '  vec2 rotatedPosition = vec2(aVertex.x * u_rotation.y + aVertex.y * u_rotation.x, aVertex.y * u_rotation.y - aVertex.x * u_rotation.x);' +
    // '  vec3 bigmatrix = m_rotation * m_projection;' +
    // '  vec2 position = (bigmatrix * vec3(aVertex, 1)).xy;' +
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
    '  gl_FragColor = vec4(fCol.x, fCol.y, fCol.z, texture2D(sampler0, vTex).w);' +
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

  constructor(terminal: NRXTerm, textCache: TextCache, glFgcContext: WebGLRenderingContext, glBgcContext: WebGLRenderingContext) {
    this.terminal = terminal;
    this.textCache = textCache;
    this.glFgContext = glFgcContext;
    this.glBgContext = glBgcContext;
    this.setupShaders();

    this.tsize = this.terminal.w * this.terminal.h * this.POINTS_PER_QUAD;
    this.verts = new Float32Array(this.tsize);
    this.clips = new Float32Array(this.tsize);
    this.fgcs = new Float32Array(this.tsize * 2);
    this.bgcs = new Float32Array(this.tsize * 2);

    this.fgVertexBuffer = this.glFgContext.createBuffer();
    this.bgVertexBuffer = this.glBgContext.createBuffer();
    this.textureBuffer = this.glFgContext.createBuffer();
    this.fgcBuffer = this.glFgContext.createBuffer();
    this.bgcBuffer = this.glBgContext.createBuffer();

    this.firstRunSetup();
  }

  private setupShaders(): void {

    // Foreground canvas, shaders, etc

    let vertShaderObj = this.glFgContext.createShader(this.glFgContext.VERTEX_SHADER);
    let fragShaderObj = this.glFgContext.createShader(this.glFgContext.FRAGMENT_SHADER);
    this.glFgContext.shaderSource(vertShaderObj, this.vertexShaderSrc);
    this.glFgContext.shaderSource(fragShaderObj, this.fragmentShaderSrc);
    this.glFgContext.compileShader(vertShaderObj);
    this.glFgContext.compileShader(fragShaderObj);

    this.textureProgram = <WebGLProgram> this.glFgContext.createProgram();
    this.glFgContext.attachShader(this.textureProgram, vertShaderObj);
    this.glFgContext.attachShader(this.textureProgram, fragShaderObj);
    this.glFgContext.linkProgram(this.textureProgram);
    this.glFgContext.useProgram(this.textureProgram);

    let vertRectShaderObj = this.glFgContext.createShader(this.glFgContext.VERTEX_SHADER);
    let fragRectShaderObj = this.glFgContext.createShader(this.glFgContext.FRAGMENT_SHADER);
    this.glFgContext.shaderSource(vertRectShaderObj, this.vertexRectShaderSrc);
    this.glFgContext.shaderSource(fragRectShaderObj, this.fragmentRectShaderSrc);
    this.glFgContext.compileShader(vertRectShaderObj);
    this.glFgContext.compileShader(fragRectShaderObj);

    this.textureAtlas = <WebGLTexture> this.glFgContext.createTexture();
    this.glFgContext.bindTexture(this.glFgContext.TEXTURE_2D, this.textureAtlas);
    this.glFgContext.pixelStorei(this.glFgContext.UNPACK_FLIP_Y_WEBGL, 1);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MIN_FILTER, this.glFgContext.NEAREST);
    this.glFgContext.texParameteri(this.glFgContext.TEXTURE_2D, this.glFgContext.TEXTURE_MAG_FILTER, this.glFgContext.NEAREST);
    this.glFgContext.texImage2D(this.glFgContext.TEXTURE_2D, 0, this.glFgContext.RGBA, this.glFgContext.RGBA, this.glFgContext.UNSIGNED_BYTE, this.textCache.canvas);

    this.glFgContext.enable(this.glFgContext.BLEND);
    this.glFgContext.blendFunc(this.glFgContext.CONSTANT_COLOR, this.glFgContext.SRC_ALPHA);
    this.glFgContext.blendFuncSeparate(this.glFgContext.SRC_ALPHA, this.glFgContext.ONE_MINUS_SRC_ALPHA, this.glFgContext.ONE, this.glFgContext.ZERO);
    
    this.glFgContext.useProgram(this.textureProgram);

    // Background canvas, shaders, etc

    let vertShaderObjBg = this.glBgContext.createShader(this.glBgContext.VERTEX_SHADER);
    let fragShaderObjBg = this.glBgContext.createShader(this.glBgContext.FRAGMENT_SHADER);
    this.glBgContext.shaderSource(vertShaderObjBg, this.vertexRectShaderSrc);
    this.glBgContext.shaderSource(fragShaderObjBg, this.fragmentRectShaderSrc);
    this.glBgContext.compileShader(vertShaderObjBg);
    this.glBgContext.compileShader(fragShaderObjBg);

    this.rectProgram = <WebGLProgram> this.glBgContext.createProgram();
    this.glBgContext.attachShader(this.rectProgram, vertShaderObjBg);
    this.glBgContext.attachShader(this.rectProgram, fragShaderObjBg);
    this.glBgContext.linkProgram(this.rectProgram);
    this.glBgContext.useProgram(this.rectProgram);

    // Both

    this.vloc = this.glFgContext.getAttribLocation(this.textureProgram, 'aVertex');
    this.tloc = this.glFgContext.getAttribLocation(this.textureProgram, 'aUV');
    this.cloc = this.glFgContext.getAttribLocation(this.textureProgram, 'fragColor');
    this.rloc = this.glFgContext.getUniformLocation(this.textureProgram, 'u_rotation');
    this.mloc = this.glFgContext.getUniformLocation(this.textureProgram, 'm_rotation');
    this.ploc = this.glFgContext.getUniformLocation(this.textureProgram, 'm_projection');

    this.bgvloc = this.glBgContext.getAttribLocation(this.rectProgram, 'aVertex');
    this.bgcloc = this.glBgContext.getAttribLocation(this.rectProgram, 'fragColor');

    this.glFgContext.viewport(0, 0, this.terminal.glFgCtx.canvas.width, this.terminal.glFgCtx.canvas.height);
    this.glBgContext.viewport(0, 0, this.terminal.glBgCtx.canvas.width, this.terminal.glBgCtx.canvas.height);

    console.log('WebGL Rendering context set up correctly and texture loaded from text canvas.');
  }

  public translation(tx: number, ty: number): number[] {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ];
  }
  
  public rotation(angleInRadians: number): number[] {
    // let c = Math.cos(angleInRadians);
    // let s = Math.sin(angleInRadians);
    let c = Math.cos(angleInRadians);
    let s = Math.sin(angleInRadians);
    return [
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ];
  }
  
  public projection(width: number, height: number): number[] {
    // Note: This matrix flips the Y axis so that 0 is at the top.
    return [
      2 / width, 0, 0,
      0, -2 / height, 0,
      -1, 1, 1
    ];
  }

  public multiply(a: number[], b: number[]): number[] {
    const a00 = a[0 * 3 + 0];
    const a01 = a[0 * 3 + 1];
    const a02 = a[0 * 3 + 2];
    const a10 = a[1 * 3 + 0];
    const a11 = a[1 * 3 + 1];
    const a12 = a[1 * 3 + 2];
    const a20 = a[2 * 3 + 0];
    const a21 = a[2 * 3 + 1];
    const a22 = a[2 * 3 + 2];
    const b00 = b[0 * 3 + 0];
    const b01 = b[0 * 3 + 1];
    const b02 = b[0 * 3 + 2];
    const b10 = b[1 * 3 + 0];
    const b11 = b[1 * 3 + 1];
    const b12 = b[1 * 3 + 2];
    const b20 = b[2 * 3 + 0];
    const b21 = b[2 * 3 + 1];
    const b22 = b[2 * 3 + 2];
    return [
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22,
    ];
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
        this.bgcs.set(new Float32Array([
          1, 1, 0, 0,
          1, 1, 0, 0,
          1, 1, 0, 0,
          1, 1, 0, 0,
          1, 1, 0, 0,
          1, 1, 0, 0,
        ]), index * 2);
      }
    }
  }

  public bindAndBuffer(data: Float32Array, buffer: WebGLBuffer, arrayType?: number): void {
    this.glFgContext.bindBuffer(this.glFgContext.ARRAY_BUFFER, buffer);
    this.glFgContext.bufferData(this.glFgContext.ARRAY_BUFFER, data, (arrayType ? arrayType : this.glFgContext.STATIC_DRAW));
  }

  // Enables a vertex attribute array, binds a buffer, optionally binds a texture if drawing a textured quad, and... I
  // honestly don't know enough about how WebGL works to write a coherent comment here explaining what is happening
  public enableVertexArray(attribPointer: number, buffer: WebGLBuffer, step: number, texture?: WebGLTexture): void {
    this.glFgContext.enableVertexAttribArray(attribPointer);
    this.glFgContext.bindBuffer(this.glFgContext.ARRAY_BUFFER, buffer);
    if (texture) {
      this.glFgContext.bindTexture(this.glFgContext.TEXTURE_2D, texture);
    }
    this.glFgContext.vertexAttribPointer(attribPointer, step, this.glFgContext.FLOAT, false, 0, 0);
  }

  public pushForegroundCharacterAndColorData(i: number, j: number, char: string, r: number, g: number, b: number): any {
    let index = (j * this.terminal.w * this.POINTS_PER_QUAD) + (i * this.POINTS_PER_QUAD);
    let fgcIndex = index * 2;
    this.clips.set(this.textCache.getCharacterVertices(char), index);
    for (let n = 0; n < 24; n += 4) {
      this.fgcs[fgcIndex + n + 0] = r;
      this.fgcs[fgcIndex + n + 1] = g;
      this.fgcs[fgcIndex + n + 2] = b;
    }
  }

  public pushBackgroundColorData(i: number, j: number, r: number, g: number, b: number): any {
    let bgcIndex = (j * this.terminal.w * this.POINTS_PER_QUAD) + (i * this.POINTS_PER_QUAD);
    bgcIndex *= 2;
    for (let n = 0; n < 24; n += 4) {
      this.bgcs[bgcIndex + n + 0] = r;
      this.bgcs[bgcIndex + n + 1] = g;
      this.bgcs[bgcIndex + n + 2] = b;
    }
  }

  public switchProgram(str: string): void {
    if (str === 'BACKGROUND') {
      this.glBgContext.useProgram(this.rectProgram);
    } else if (str === 'FOREGROUND') {
      this.glFgContext.useProgram(this.textureProgram);
    }
  }

  public draw(): void {
    // this.switchProgram('FOREGROUND');
    
    this.glFgContext.scissor(0, 0, this.terminal.glFgCtx.canvas.width, this.terminal.glFgCtx.canvas.height);
    this.glFgContext.clearColor(0, 0, 0, 0);
    this.glFgContext.clear(this.glFgContext.COLOR_BUFFER_BIT);
    
    let w = (2 / this.terminal.w);
    let h = (2 / this.terminal.h);
    
    this.glFgContext.uniform2fv(this.rloc, [w / 2, h / 2]);
    
    this.glFgContext.uniformMatrix3fv(this.mloc, false, this.rotation(Math.PI));
    this.glFgContext.uniformMatrix3fv(this.ploc, false, this.projection(this.glFgContext.canvas.width, this.glFgContext.canvas.height));

    this.bindAndBuffer(this.verts, this.fgVertexBuffer);
    // this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.vertexBuffer);
    this.bindAndBuffer(this.fgcs, this.fgcBuffer);
    this.bindAndBuffer(this.clips, this.textureBuffer);

    this.enableVertexArray(this.vloc, this.fgVertexBuffer, 2);
    this.enableVertexArray(this.cloc, this.fgcBuffer, 4);
    this.enableVertexArray(this.tloc, this.textureBuffer, 2, this.textureAtlas);

    this.glFgContext.drawArrays(this.glFgContext.TRIANGLES, 0, this.verts.length / 2);
    
    // this.switchProgram('BACKGROUND');
    
    this.glBgContext.bindBuffer(this.glBgContext.ARRAY_BUFFER, this.bgVertexBuffer);
    this.glBgContext.bufferData(this.glBgContext.ARRAY_BUFFER, this.verts, this.glBgContext.STATIC_DRAW);
    this.glBgContext.bindBuffer(this.glBgContext.ARRAY_BUFFER, this.bgcBuffer);
    this.glBgContext.bufferData(this.glBgContext.ARRAY_BUFFER, this.bgcs, this.glBgContext.STATIC_DRAW);

    this.glBgContext.enableVertexAttribArray(this.bgvloc);
    this.glBgContext.bindBuffer(this.glBgContext.ARRAY_BUFFER, this.bgVertexBuffer);
    this.glBgContext.vertexAttribPointer(this.bgvloc, 2, this.glBgContext.FLOAT, false, 0, 0);

    this.glBgContext.enableVertexAttribArray(this.bgcloc);
    this.glBgContext.bindBuffer(this.glBgContext.ARRAY_BUFFER, this.bgcBuffer);
    this.glBgContext.vertexAttribPointer(this.bgcloc, 4, this.glBgContext.FLOAT, false, 0, 0);

    this.glBgContext.drawArrays(this.glBgContext.TRIANGLES, 0, this.verts.length / 2);
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
