import pkg from './package.json'
import glsl from 'rollup-plugin-glsl'

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.umd, format: 'umd', name: 'Webgl' },
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' }
  ],
  plugins: [
  	glsl({
  		include: '**/*.glsl'
  	})
  ]
}
