export const timeout = (ms: number, errorMessage = 'Operation timed out') => {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
}
