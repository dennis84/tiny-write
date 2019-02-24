declare module 'insert-css' {
  interface Options {
    container?: Element,
    prepend?: boolean,
  }

  export function insertCss(css: string, options?: Options): void
}
