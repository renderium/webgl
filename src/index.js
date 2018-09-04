import * as glUtils from './utils/webgl'
import vertexShaderSource from './shaders/vertex.glsl'
import fragmentShaderSource from './shaders/fragment.glsl'

function noop () {}

var pixelRatio = window.devicePixelRatio || 1
var queue = []
var webgl
var prevTime

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
}

export default Webgl
