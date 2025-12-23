import {useIsRouting} from '@solidjs/router'
import {createEffect, on} from 'solid-js'

export const useBeforeLeave = (callback: () => void) => {
  const isRouting = useIsRouting()
  // Is called then leaving the page, also for navigating back
  // which is not triggered by useBeforeLeave
  createEffect(
    on(
      () => isRouting(),
      (status) => {
        if (status) callback()
      },
      {defer: true},
    ),
  )
}
