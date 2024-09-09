import {onCleanup, onMount, Switch, Match, ErrorBoundary} from 'solid-js'
import {createMutable} from 'solid-js/store'
import {Route, Router, RouteSectionProps, useNavigate} from '@solidjs/router'
import * as tauriWindow from '@tauri-apps/api/window'
import {State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import * as remote from '@/remote'
import {isTauri} from '@/env'
import {Layout} from '@/components/Layout'
import {Menu} from '@/components/menu/Menu'
import {Error} from '@/components/Error'
import {Dir} from '@/components/Dir'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'
import {InputLine} from '@/components/dialog/InputLine'
import {EditorPage} from '@/components/pages/EditorPage'
import {CanvasPage} from '@/components/pages/CanvasPage'
import {CodePage} from '@/components/pages/CodePage'
import {Redirect} from '@/components/pages/Redirect'

export const Main = (props: {state: State}) => {
  const Root = (p: RouteSectionProps) => {
    remote.info(
      `Open route (path=${p.location.pathname}, search=${JSON.stringify(p.location.query)})`,
    )

    const ctrl = createCtrl(props.state)
    const navigate = useNavigate()

    const mouseEnterCoords = createMutable({x: 0, y: 0})
    const [inputLine, setInputLine] = ctrl.appService.inputLine

    let layoutRef!: HTMLDivElement

    const onDragOver = (e: DragEvent) => {
      mouseEnterCoords.x = e.pageX
      mouseEnterCoords.y = e.pageY
    }

    const onViewError = (error: any, reset: any) => {
      ctrl.appService.setError({error})
      reset()
      return <></>
    }

    onMount(() => {
      ctrl.appService.layoutRef = layoutRef
      const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
      const onUpdateDarkMode = () => ctrl.configService.updateDarkMode()
      matchDark.addEventListener('change', onUpdateDarkMode)
      onCleanup(() => matchDark.removeEventListener('change', onUpdateDarkMode))
    })

    onMount(async () => {
      await ctrl.appService.init()
    })

    onMount(() => {
      if (!isTauri()) return
      const unlistenProm = tauriWindow.getCurrentWindow().onDragDropEvent(async (event) => {
        if (event.payload.type === 'over') {
          remote.info('🔗 User hovering')
        } else if (event.payload.type === 'drop') {
          remote.info('🔗 User dropped')
          for (const path of event.payload.paths) {
            const {x, y} = event.payload.position
            const result = await ctrl.mediaService.dropPath(path, [x, y])
            if (result?.file) {
              navigate(`/${result.file.code ? 'code' : 'editor'}/${result.file.id}`)
            }
          }
        } else {
          remote.info('🔗 File drop cancelled')
        }
      })

      onCleanup(async () => (await unlistenProm)())
    })

    onMount(() => {
      if (!isTauri()) return
      const unlistenResizeProm = tauriWindow.getCurrentWindow().onResized(async ({payload}) => {
        const {width, height} = payload
        await ctrl.appService.updateWindow({width, height})
      })

      const unlistenMoveProm = tauriWindow.getCurrentWindow().onMoved(async ({payload}) => {
        const {x, y} = payload
        await ctrl.appService.updateWindow({x, y})
      })

      onCleanup(async () => {
        ;(await unlistenResizeProm)()
        ;(await unlistenMoveProm)()
      })
    })

    onMount(() => {
      if (isTauri()) return
      const onDrop = async (e: DragEvent) => {
        e.preventDefault()

        // don't drop files in codemirror
        if ((e.target as Element).closest('.cm-editor')) {
          return
        }

        for (const file of e.dataTransfer?.files ?? []) {
          if (file.type.startsWith('image/')) {
            const x = mouseEnterCoords.x
            const y = mouseEnterCoords.y
            await ctrl.mediaService.dropFile(file, [x, y])
          }
        }
      }

      const onDragOver = (e: DragEvent) => e.preventDefault()

      window.addEventListener('drop', onDrop, false)
      window.addEventListener('dragover', onDragOver, false)

      onCleanup(() => {
        window.removeEventListener('drop', onDrop, false)
        window.removeEventListener('dragover', onDragOver, false)
      })
    })

    return (
      <StateContext.Provider value={ctrl}>
        <ErrorBoundary fallback={onViewError}>
          <Layout ref={layoutRef} onDragOver={onDragOver} data-testid={ctrl.store.loading}>
            <Switch>
              <Match when={ctrl.store.error}>
                <Error />
              </Match>
              <Match when={ctrl.store.args?.dir?.length && ctrl.store.loading === 'initialized'}>
                <Dir />
              </Match>
              <Match when={ctrl.store.loading === 'initialized'}>{p.children}</Match>
            </Switch>
            <MouseCursor />
            <Menu />
            <Keymap />
            <Variables />
            <InputLine getter={inputLine} setter={setInputLine} />
          </Layout>
        </ErrorBoundary>
      </StateContext.Provider>
    )
  }

  return (
    <Router root={Root}>
      <Route path="/editor/:id" component={EditorPage} />
      <Route path="/canvas/:id" component={CanvasPage} />
      <Route path="/code/:id" component={CodePage} />
      <Route path="*" component={Redirect} />
    </Router>
  )
}
