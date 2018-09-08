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
