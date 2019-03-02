import {uglify} from 'rollup-plugin-uglify'
import typescript from 'rollup-plugin-typescript'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import {string} from 'rollup-plugin-string'

const production = !process.env.ROLLUP_WATCH

export default {
  input: 'src/index.tsx',
  output: {
    name: 'write',
    file: 'dist/index.js',
    format: 'iife',
    sourcemap: true,
  },
  plugins: [
    commonjs(),
    string({
      include: "**/*.svg",
    }),
    typescript({tsconfig: 'tsconfig.json'}),
    resolve(),
    production && uglify(),
  ],
}
