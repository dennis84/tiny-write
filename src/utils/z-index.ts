export enum IndexType {
  CONTENT = 1,
  LINK = 2,
  BOUNDS = 3,
  HANDLE = 4,
}

export const zIndex = (index: number, type: IndexType) =>
  String(index * 10 + type)
