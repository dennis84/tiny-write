import {useBeforeLeave as useBeforeLeaveOrg, useIsRouting} from '@solidjs/router'
import {createEffect, on} from 'solid-js'
import type {LocationState} from '@/types'

export const useBeforeLeave = (callback: () => void) => {
  const isRouting = useIsRouting()
  let stopEvent = false

  // Call callback on real browser unload
  window.addEventListener('beforeunload', () => callback())

  // This hooks is called before isRouting, it should stop the custom hook
  // if navigating to same url for state state changes
  useBeforeLeaveOrg((args) => {
    const fromState = args.from.state as LocationState | null
    const toState = args.options?.state as LocationState | null

    if (args.to !== args.from.pathname) return
    if (fromState?.merge !== toState?.merge) return

    stopEvent = true
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
        if (status) {
          callback()
        }
      },
      {defer: true},
    ),
  )
}
