import {createEffect, createSignal, onCleanup} from 'solid-js'
import {useState} from '@/state'

export const useCollabCount = () => {
  const {store} = useState()
  const [count, setCount] = createSignal(0)

  createEffect(() => {
    const provider = store.collab?.provider
    if (!provider?.awareness) {
      setCount(0)
      return
    }

    const awareness = provider.awareness

    // Handler to update the count
    const updateCount = () => {
      setCount(awareness.getStates().size)
    }

    // Initial count
    updateCount()

    // Listen for future changes
    awareness.on('update', updateCount)

    // Cleanup listener on effect teardown (e.g. when provider changes or component unmounts)
    onCleanup(() => {
      awareness.off('update', updateCount)
    })
  })

  return count
}
