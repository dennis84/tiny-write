import '@emotion/react'
import {Args, Config} from '../src'
import {Page} from 'playwright'

declare module '@emotion/react' {
  export interface Theme extends Config {}
}

interface FileInfo {
  file: string;
  buffer: Buffer;
  lastModified: string;
}

interface Preload {
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  setSimpleFullScreen: (flag: boolean) => Promise<void>;
  isSimpleFullScreen: () => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<void>;
  quit: () => Promise<void>;
  fileExists: (str: string) => Promise<boolean>;
  isImage: (str: string) => Promise<boolean>;
  readFile: (str: string) => Promise<FileInfo>;
  writeFile: (file: string, content: string) => Promise<void>;
  getArgs: () => Promise<Args>;
  resolve: (base: string, src: string) => Promise<string>;
  log: (...args: any) => void;
  on: (name: string, fn: (...args: any) => void) => void;
}

declare global {
  interface Window {
    app: Preload;
    process?: {platform: string};
  }

  const page: Page;
}
