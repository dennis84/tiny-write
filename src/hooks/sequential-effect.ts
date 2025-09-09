import {type Accessor, createEffect, createSignal, untrack} from 'solid-js'

/**
 * Creates an effect that executes tasks sequentially.
 *
 * @param source A reactive function that returns the data to be processed.
 * @param processor A function that processes an item from the source. It can be async.
 */
export function createSequentialEffect<T>(
  source: Accessor<T>,
  processor: (item: T) => Promise<void> | void,
) {
  const [queue, setQueue] = createSignal<T[]>([])
  const [processing, setProcessing] = createSignal(false)

  const processQueue = async () => {
    if (processing() || queue().length === 0) {
      return
    }
    setProcessing(true)
    while (queue().length > 0) {
      const item = queue().shift()
      if (item) await processor(item)
    }
    setProcessing(false)
  }

  createEffect(async () => {
    const newItem = source()
    // Untrack is used to prevent this effect from re-running when queue changes.
    untrack(async () => {
      setQueue((prev) => [...prev, newItem])
      await processQueue()
    })
  })
}
