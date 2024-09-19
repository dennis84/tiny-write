export enum IndexType {
  CONTENT = 1,
  LINK = 2,
  BOUNDS = 3,
  HANDLE = 4,
}

const MAX = 2147483647

export class ZIndex {
  static MAX = MAX.toString()
  static TOOLTIP = MAX.toString()
  static HANDLE = (MAX - 1).toString()
  static TABLE_SELECTION = (MAX - 2).toString()

  static ABOVE_CONTENT = String(1000)

  // Get z-index for an canvas element
  static element(index: number, type: IndexType) {
    return String(index * 10 + type)
  }
}
