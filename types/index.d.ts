import {Page} from 'playwright'

declare global {
  interface Window {
    process?: {platform: string};
  }

  const page: Page;
}
