precision mediump float;

uniform sampler2D atlas; 

varying vec4 hue;
varying vec2 texel;

void main() {
  gl_FragColor = hue + texture2D(atlas, texel);
}
