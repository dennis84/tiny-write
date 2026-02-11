import {useBeforeLeave as useBeforeLeaveOrg, useIsRouting} from '@solidjs/router'
import {createEffect, on} from 'solid-js'

export const useBeforeLeave = (callback: () => void) => {
  const isRouting = useIsRouting()
  let stopEvent = false

  // This hooks is called before isRouting, it should stop the custom hook
  // if navigating to same url for state state changes
  useBeforeLeaveOrg((args) => {
    if (typeof args.to !== 'number' && args.to === args.from.pathname) {
      stopEvent = true
    }
  })

  // Is called then leaving the page, also for navigating back
  // which is not triggered by useBeforeLeave
  createEffect(
    on(
      () => isRouting(),
      (status) => {
        if (stopEvent) {
          stopEvent = false
          return
        }

        stopEvent = false
        if (status) callback()
      },
      {defer: true},
    ),
  )
}
