export function enumFromValue<T extends Record<string, string>>(
  enumObj: T,
  value: string | undefined,
): T[keyof T] | undefined {
  if (!value) return undefined
  return Object.values(enumObj).includes(value) ? (value as T[keyof T]) : undefined
}
