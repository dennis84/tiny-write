// import {createEffect, createMemo} from 'solid-js'
//
// type EffectFunction = () => void | Promise<void>
//
// export function createSequentialEffect(fn: EffectFunction): void {
//   let queue = Promise.resolve()
//   let executionCounter = 0
//
//   // Create a memo that tracks dependencies and increments on changes
//   const trigger = createMemo(() => {
//     // Call the function to track its dependencies
//     // but don't execute the actual logic yet
//     fn()
//     return ++executionCounter
//   })
//
//   createEffect(() => {
//     const currentTrigger = trigger()
//
//     queue = queue.then(async () => {
//       try {
//         const result = fn()
//         // Handle both sync and async functions
//         if (result instanceof Promise) {
//           await result
//         }
//       } catch (error) {
//         console.error('Sequential effect error:', error)
//       }
//     })
//   })
// }
//
// // export function createSequentialEffect(fn: EffectFunction): void {
// //   let queue = Promise.resolve()
// //
// //
// //   createEffect(() => {
// //     // This will re-run whenever the dependencies tracked in the memo change
// //
// //     // Queue the execution
// //     queue = queue.then(async () => {
// //       try {
// //         const result = fn()
// //         if (result instanceof Promise) {
// //           await result
// //         }
// //       } catch (error) {
// //         console.error('Sequential effect error:', error)
// //       }
// //     })
// //   })
// // }
//

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
