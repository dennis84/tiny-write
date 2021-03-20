import '@emotion/react'
import {Config} from '../src'

declare module '@emotion/react' {
  export interface Theme extends Config {}
}

interface FileInfo {
  file: string;
  buffer: Buffer;
}

interface Preload {
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  setSimpleFullScreen: (flag: boolean) => Promise<void>;
  isSimpleFullScreen: () => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<void>;
  quit: () => Promise<void>;
  getVersion: () => Promise<string>;
  fileExists: (str: string) => Promise<boolean>;
  readFile: (str: string) => Promise<FileInfo>;
  writeFile: (file: string, content: string) => Promise<void>;
}

declare global {
  interface Window {
    app: Preload;
    process?: {env: {npm_package_version: string}};
  }
}
