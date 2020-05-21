import resolve from 'rollup-plugin-node-resolve'
import pkg from './package.json'

export default {
  input: 'dist/index.js',
  output: [
    {
      file: pkg['module'],
      format: 'es'
    }
  ],
  plugins: [resolve()]
}
