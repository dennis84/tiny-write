import {Accessor, createEffect, createSignal} from 'solid-js'
import {useCurrentMatches} from '@solidjs/router'
import {Page} from '@/state'

export const useCurrentPage = (): Accessor<Page | undefined> => {
  const [currentPage, setCurrentPage] = createSignal<Page>()
  const currentMatches = useCurrentMatches()

  createEffect(() => {
    const page = currentMatches()?.[0].route.info?.page
    setCurrentPage(page)
  })

  return currentPage
}
