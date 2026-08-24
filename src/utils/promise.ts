export const timeout = (ms: number, errorMessage = 'Operation timed out') => {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
}

export const pause = (ms: number) => {
  return new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms))
}

export const retry = async <T>(
  action: () => Promise<T>,
  retries: number,
  interval = 1000
): Promise<T> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await action()
    } catch (error) {
      lastError = error

      if (attempt === retries) {
        break
      }

      await pause(interval)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry failed')
}
