import * as glUtils from './utils/webgl'
import vertexShaderSource from './shaders/vertex.glsl'
import fragmentShaderSource from './shaders/fragment.glsl'

function noop () {}

var pixelRatio = window.devicePixelRatio || 1
var queue = []
var webgl
var prevTime

var GRADIENTS_COUNT = 0xff

class Webgl {
  static digest (time) {
    prevTime = prevTime || time
    while ((webgl = queue.shift())) {
      webgl.scale()
      webgl.clear()
      webgl.redraw(prevTime - time, time)
      webgl.dequeue()
    }
    prevTime = time
  }

  constructor (options) {
    this.el = options.el
    this.vertexShaderSource = options.vertexShaderSource || vertexShaderSource
    this.fragmentShaderSource = options.fragmentShaderSource || fragmentShaderSource
    this.canvas = document.createElement('canvas')
    this.renderer = noop
    this.inQueue = false
    this.width = 0
    this.height = 0
    this.el.appendChild(this.canvas)
    this.init()
    this.scale()
  }

  render (renderer) {
    this.renderer = renderer
  }

  enqueue () {
    if (this.inQueue) return
    queue.push(this)
    this.inQueue = true
  }

  dequeue () {
    this.inQueue = false
  }

  init () {
    this.initProgram()
    this.initTexture()
    this.initUniforms()
    this.initBuffers()
    this.initAttributes()
    this.initBlend()
  }

  initProgram () {
    this.gl = glUtils.getContext(this.canvas, 'webgl')
    this.vertexShader = glUtils.compileShader(
      this.gl,
      this.vertexShaderSource,
      this.gl.VERTEX_SHADER
    )
    this.fragmentShader = glUtils.compileShader(
      this.gl,
      this.fragmentShaderSource,
      this.gl.FRAGMENT_SHADER
    )
    this.program = glUtils.createProgram(
      this.gl,
      this.vertexShader,
      this.fragmentShader
    )
    this.gl.useProgram(this.program)
  }

  initTexture () {
    this.texture = this.gl.createTexture()
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture)
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(4))
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST)
  }

  initUniforms () {
    this.resolution = this.gl.getUniformLocation(this.program, 'resolution')

    this.linearGradientsCache = new Map()
    this.linearGradients = new Array(GRADIENTS_COUNT * 4)
    for (var i = 0; i < GRADIENTS_COUNT; i++) {
      var j = i * 4
      this.linearGradients[j] = this.gl.getUniformLocation(this.program, `linearGradients[${i}].start`)
      this.linearGradients[j + 1] = this.gl.getUniformLocation(this.program, `linearGradients[${i}].end`)
      this.linearGradients[j + 2] = this.gl.getUniformLocation(this.program, `linearGradients[${i}].from`)
      this.linearGradients[j + 3] = this.gl.getUniformLocation(this.program, `linearGradients[${i}].to`)
    }
  }

  initBuffers () {
    var indices = this.gl.createBuffer()
    var vertices = this.gl.createBuffer()

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indices)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertices)
  }

  initAttributes () {
    var position = this.gl.getAttribLocation(this.program, 'position')
    var center = this.gl.getAttribLocation(this.program, 'center')
    var texture = this.gl.getAttribLocation(this.program, 'texture')
    var color = this.gl.getAttribLocation(this.program, 'color')
    var theta = this.gl.getAttribLocation(this.program, 'theta')
    var linearGradient = this.gl.getAttribLocation(this.program, 'linearGradient')
    var radialGradient = this.gl.getAttribLocation(this.program, 'radialGradient')

    this.gl.enableVertexAttribArray(position)
    this.gl.enableVertexAttribArray(center)
    this.gl.enableVertexAttribArray(texture)
    this.gl.enableVertexAttribArray(color)
    this.gl.enableVertexAttribArray(theta)
    this.gl.enableVertexAttribArray(linearGradient)
    this.gl.enableVertexAttribArray(radialGradient)

    this.gl.vertexAttribPointer(
      position,
      2,
      this.gl.SHORT,
      false,
      20,
      0
    )
    this.gl.vertexAttribPointer(
      center,
      2,
      this.gl.SHORT,
      false,
      20,
      4
    )
    this.gl.vertexAttribPointer(
      texture,
      2,
      this.gl.UNSIGNED_SHORT,
      false,
      20,
      8
    )
    this.gl.vertexAttribPointer(
      color,
      4,
      this.gl.UNSIGNED_BYTE,
      true,
      20,
      12
    )
    this.gl.vertexAttribPointer(
      theta,
      1,
      this.gl.SHORT,
      true,
      20,
      16
    )
    this.gl.vertexAttribPointer(
      linearGradient,
      1,
      this.gl.UNSIGNED_BYTE,
      false,
      20,
      18
    )
    this.gl.vertexAttribPointer(
      radialGradient,
      1,
      this.gl.UNSIGNED_BYTE,
      false,
      20,
      19
    )
  }

  initBlend () {
    // https://limnu.com/webgl-blending-youre-probably-wrong/
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)
  }

  clear () {
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
  }

  scale () {
    var width = this.el.clientWidth
    var height = this.el.clientHeight
    if (width !== this.width || height !== this.height) {
      this.width = width
      this.height = height
      this.canvas.style.width = `${this.width}px`
      this.canvas.style.height = `${this.height}px`
      this.gl.viewport(0, 0, this.width * pixelRatio, this.height * pixelRatio)
      this.gl.uniform2f(this.resolution, this.width, this.height)
    }
  }

  redraw (delta, elapsed) {
    this.renderer(this, delta, elapsed)
  }

  setGradient (gradient) {
    var idx = this.linearGradientsCache.size
    if (this.map.has(gradient)) {
      idx = this.map.get(gradient)
    }
    idx *= 4
    this.gl.uniform2f(this.linearGradients[idx], gradient.start.x, gradient.start.y)
    this.gl.uniform2f(this.linearGradients[idx + 1], gradient.end.x, gradient.end.y)
    this.gl.uniform4fv(this.linearGradients[idx + 2], gradient.from)
    this.gl.uniform4fv(this.linearGradients[idx + 3], gradient.to)
  }
}

export default Webgl
