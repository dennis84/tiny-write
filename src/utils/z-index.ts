export enum IndexType {
  CONTENT = 1,
  LINK = 2,
  BOUNDS = 3,
  HANDLE = 4,
}

export class ZIndex {
  // For overlays drag handle etc.
  static MAX = Number.MAX_SAFE_INTEGER.toString()

  // Get z-index for an canvas element
  static element(index: number, type: IndexType) {
    return String(index * 10 + type)
  }
}
