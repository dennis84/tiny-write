import '@emotion/react'
import {Config} from '../src'
import {Preload} from '../preload'
import {Page} from 'playwright'

declare module '@emotion/react' {
  export interface Theme extends Config {}
}

declare global {
  interface Window {
    app: Preload;
    process?: {platform: string};
  }

  const page: Page;
}
