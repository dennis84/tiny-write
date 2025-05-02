export const timeout = (ms: number, errorMessage = 'Operation timed out') => {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
}

export const pause = (ms: number) => {
  return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms))
}
