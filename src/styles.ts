import * as FS from 'free-style'

export const freestyle = FS.create((x: string) => FS.stringHash(x))
