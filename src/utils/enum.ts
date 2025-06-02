export function enumFromValue<T extends Record<string, string>>(
  enumObj: T,
  value: string,
): T[keyof T] | undefined {
  return Object.values(enumObj).includes(value) ? (value as T[keyof T]) : undefined
}
