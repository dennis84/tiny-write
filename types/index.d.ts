import '@emotion/react'
import {Config} from '../src'
import {Page} from 'playwright'

declare module '@emotion/react' {
  export interface Theme extends Config {}
}

declare global {
  interface Window {
    process?: {platform: string};
  }

  const page: Page;
}
