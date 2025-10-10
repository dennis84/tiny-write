import {type RouteSectionProps, useLocation} from '@solidjs/router'
import {Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useOpen} from '@/hooks/open'
import {info} from '@/remote/log'
import {type LocationState, Page, useState} from '@/state'
import {ButtonPrimary} from '../Button'
import {CodeEditor} from '../code/CodeEditor'
import {MergeMenu} from '../code/MergeMenu'
import {Loading} from './Loading'
import {Title} from './Title'

export const NewCodePage = () => {
  const location = useLocation<LocationState | undefined>()
  const {fileService} = useState()
  const {openFile} = useOpen()

  const Center = styled('div')`
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: center;
  `

  const onClick = async () => {
    const join = location.query?.join as string | undefined
    const newFile = await fileService.newFile({id: join, code: true})
    openFile(newFile, {share: join !== undefined})
  }

  return (
    <Center data-testid="new_code_page">
      <Switch>
        <Match when={location.query.join}>
          {(id) => (
            <ButtonPrimary onClick={onClick} data-testid="join_file">
              Join code file {id()}
            </ButtonPrimary>
          )}
        </Match>
        <Match when={true}>
          <ButtonPrimary onClick={onClick} data-testid="new_file">
            New code file
          </ButtonPrimary>
        </Match>
      </Switch>
    </Center>
  )
}

export const CodePage = (props: RouteSectionProps) => {
  const location = useLocation<LocationState | undefined>()
  const {store, appService, codeService, fileService, toastService} = useState()
  const {open} = useOpen()

  const OpenCodeEditor = () => {
    info(`Render code page (location=${JSON.stringify(props.location.state)})`)

    onMount(async () => {
      try {
        await codeService.init()
        fileService.currentFile?.codeEditorView?.focus()
      } catch (e) {
        await appService.setLocation(undefined)
        const message = e instanceof Error ? e.message : String(e)
        toastService.open({message, duration: 10_000})
        open({page: Page.Code})
      }
    })

    return (
      <>
        {/* Wait until collab is initialized */}
        <Show fallback={<Loading />} when={store.collab?.id === props.params.id}>
          <Title />
          <CodeEditor />
          <MergeMenu />
        </Show>
      </>
    )
  }

  return (
    <>
      {/* Rerender if location changes */}
      {/* eslint-disable-next-line */}
      <Show when={props.params.id && (location.state || !location.state)} keyed>
        <OpenCodeEditor />
      </Show>
    </>
  )
}
