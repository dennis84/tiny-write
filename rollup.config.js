import typescript from '@rollup/plugin-typescript'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import {terser} from 'rollup-plugin-terser'

const production = !process.env.ROLLUP_WATCH

export default {
  input: 'src/index.tsx',
  output: {
    name: 'write',
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    commonjs(),
    typescript({tsconfig: 'tsconfig.json'}),
    resolve({mainFields: ['main']}),
    production && terser(),
  ],
}
