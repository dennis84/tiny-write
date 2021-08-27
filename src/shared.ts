export interface FileInfo {
  file: string;
  mime: string;
  ext: string;
  buffer: Buffer;
  lastModified: string;
}

export interface Args {
  cwd?: string;
  file?: string;
  room?: string;
  text?: any;
}
