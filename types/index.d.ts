import '@emotion/react'
import {Config} from '../src'

declare module '@emotion/react' {
  export interface Theme extends Config {}
}
