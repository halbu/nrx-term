// Shaders all defined here for the sake of keeping the renderer class a bit tidier
export class GlShaders {

  public static vertexShaderFgSrc =
    'attribute vec2 aVertex;' +
    'attribute vec2 cVertex;' +
    'attribute vec2 aUV;' +
    'attribute vec4 fragColor;' +
    'attribute float rotation;' +
    'uniform float canvas_w;' +
    'uniform float canvas_h;' +
    'varying vec2 vTex;' +
    'varying vec4 fCol;' +

    'void main(void) {' +
    // Rotate this vertex about the centre point of its quad.
    '  float px = aVertex.x - cVertex.x;' +
    '  float py = aVertex.y - cVertex.y;' +
    '  float npx = (px * cos(rotation)) - (py * sin(rotation)) + cVertex.x;' +
    '  float npy = (px * sin(rotation)) + (py * cos(rotation)) + cVertex.y;' +

    // Take the rotated vertex and convert its co-ordinates to clipspace [-1, 1].
    '  float nx = npx / canvas_w * 2.0 - 1.0;' +
    '  float ny = -(npy / canvas_h * 2.0 - 1.0);' +

    // Pass everything along to the fragment shader.
    '  gl_Position = vec4(nx, ny, 0.0, 1.0);' +
    '  vTex = aUV;' +
    '  fCol = fragColor;' +
    '}';

  public static fragmentShaderFgSrc =
    'precision highp float;' +
    'varying vec2 vTex;' +
    'varying vec4 fCol;' +
    'uniform sampler2D sampler0;' +

    'void main(void){' +

    // Test the alpha of the texel to see if this pixel is part of a glyph.
    // Discard it if not in order that when rotating characters we do not
    // unintentionally affect the alpha channel of adjacent glyphs
    '  if (texture2D(sampler0, vTex).w < 0.1) {' +
    '    discard;' +
    '  } else {' +
    '    gl_FragColor = vec4(fCol.x, fCol.y, fCol.z, texture2D(sampler0, vTex).w);' +
    '  }' +
    '}';

  public static vertexShaderBgSrc =
    'attribute vec2 aVertex;' +
    'attribute vec4 fragColor;' +
    'varying vec4 fCol;' +
    'uniform float canvas_w;' +
    'uniform float canvas_h;' +

    'void main(void) {' +
    // Convert this worldspace vertex's co-ordinates to clipspace [-1, 1].
    '  float nx = aVertex.x / canvas_w * 2.0 - 1.0;' +
    '  float ny = -(aVertex.y / canvas_h * 2.0 - 1.0);' +

    // Pass everything along to the frag shader.
    '  gl_Position = vec4(nx, ny, 0.0, 1.0);' +
    '  fCol = fragColor;' +
    '}';

  public static fragmentShaderBgSrc =
    'precision mediump float;' +
    'varying vec4 fCol;' +

    'void main(void) {' +
    '  gl_FragColor = fCol;' +
    '}';
}
