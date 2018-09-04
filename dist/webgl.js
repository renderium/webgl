function getContext (canvas) {
  var gl = canvas.getContext('webgl');
  gl.getExtension('OES_element_index_uint');
  return gl
}

function compileShader (gl, shaderSource, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw new Error(`Renderium: Could not compile shader:\r\n${gl.getShaderInfoLog(shader)}`)
  }
  return shader
}

function createProgram (gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    throw new Error(`Renderium: Program failed to link:\r\n${gl.getProgramInfoLog(program)}`)
  }
  return program
}

var vertexShaderSource = "const vec2 unit=vec2(1,-1);struct LinearGradient{vec2 start;vec2 end;vec4 from;vec4 to;};uniform vec2 resolution;uniform LinearGradient linearGradients[255];float angleTo(vec2 one,vec2 another){return acos(dot(one,another)/(length(one)*length(another)));}vec4 clipSpace(vec2 position){return vec4((position/resolution*2.0-1.0)*unit,0,1);}attribute vec2 position;attribute vec2 center;attribute vec2 texture;attribute vec4 color;attribute float theta;attribute float linearGradient;vec2 rotate(){float c=cos(theta);float s=sin(theta);mat2 rotation=mat2(c,-s,s,c);vec2 diretion=position-center;return center+rotation*diretion;}vec4 linearGradientColor(vec2 position){LinearGradient gradient=linearGradients[int(linearGradient)];vec2 len=gradient.end-gradient.start;vec2 dist=position-gradient.start;float angle=angleTo(len,dist);float percents=(length(dist)*cos(angle))/length(len);return mix(gradient.from,gradient.to,percents);}varying vec4 hue;varying vec2 texel;void main(){vec2 pos=rotate();texel=texture;hue=color+linearGradientColor(pos);gl_Position=clipSpace(pos);}";

var fragmentShaderSource = "precision mediump float;uniform sampler2D atlas;varying vec4 hue;varying vec2 texel;void main(){gl_FragColor=hue+texture2D(atlas,texel);}";

function noop () {}

var pixelRatio = window.devicePixelRatio || 1;
var queue = [];
var webgl;
var prevTime;

class Webgl {
  static digest (time) {
    prevTime = prevTime || time;
    while ((webgl = queue.shift())) {
      webgl.scale();
      webgl.clear();
      webgl.redraw(prevTime - time, time);
      webgl.dequeue();
    }
    prevTime = time;
  }

  constructor (options) {
    this.el = options.el;
    this.vertexShaderSource = options.vertexShaderSource || vertexShaderSource;
    this.fragmentShaderSource = options.fragmentShaderSource || fragmentShaderSource;
    this.canvas = document.createElement('canvas');
    this.renderer = noop;
    this.inQueue = false;
    this.width = 0;
    this.height = 0;
    this.el.appendChild(this.canvas);
    this.init();
    this.scale();
  }

  render (renderer) {
    this.renderer = renderer;
  }

  enqueue () {
    if (this.inQueue) return
    queue.push(this);
    this.inQueue = true;
  }

  dequeue () {
    this.inQueue = false;
  }

  init () {
    this.gl = getContext(this.canvas, 'webgl');
    this.vertexShader = compileShader(
      this.gl,
      this.vertexShaderSource,
      this.gl.VERTEX_SHADER
    );
    this.fragmentShader = compileShader(
      this.gl,
      this.fragmentShaderSource,
      this.gl.FRAGMENT_SHADER
    );
    this.program = createProgram(
      this.gl,
      this.vertexShader,
      this.fragmentShader
    );
    this.gl.useProgram(this.program);
  }

  clear () {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  scale () {
    var width = this.el.clientWidth;
    var height = this.el.clientHeight;
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.gl.viewport(0, 0, this.width * pixelRatio, this.height * pixelRatio);
      this.gl.uniform2f(this.resolution, this.width, this.height);
    }
  }

  redraw (delta, elapsed) {
    this.renderer(this, delta, elapsed);
  }
}

export default Webgl;