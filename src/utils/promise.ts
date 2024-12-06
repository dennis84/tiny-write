export const timeout = (ms: number, errorMessage = 'Operation timed out') => {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
}
