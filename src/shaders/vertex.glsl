const vec2 unit = vec2(1, -1);

struct LinearGradient {
  vec2 start;
  vec2 end;
  vec4 from;
  vec4 to;
};

uniform vec2 resolution;
uniform LinearGradient linearGradients[255];

float angleTo (vec2 one, vec2 another) {
  return acos(dot(one, another) / (length(one) * length(another)));
}

vec4 clipSpace (vec2 position) {
  return vec4((position / resolution * 2.0 - 1.0) * unit, 0, 1);
}

// Vertex

attribute vec2 position;
attribute vec2 center;
attribute vec2 texture;
attribute vec4 color;
attribute float theta;
attribute float linearGradient;
attribute float radialGradient;

vec2 rotate () {
  float c = cos(theta);
  float s = sin(theta);
  mat2 rotation = mat2(c, -s, s, c);
  vec2 diretion = position - center;
  return center + rotation * diretion;
}

vec4 linearGradientColor (vec2 position) {
  LinearGradient gradient  = linearGradients[int(linearGradient)];
  vec2 len = gradient.end - gradient.start;
  vec2 dist = position - gradient.start;
  float angle = angleTo(len, dist);
  float percents = (length(dist) * cos(angle)) / length(len);
  return mix(gradient.from, gradient.to, percents);
}

vec4 radialGradientColor () {
  return vec4(0);
}

varying vec4 hue;
varying vec2 texel;

void main () {
  vec2 pos = rotate();
  texel = texture;
  hue = color + linearGradientColor(pos) + radialGradientColor();
  gl_Position = clipSpace(pos);
}