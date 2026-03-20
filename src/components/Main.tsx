import {Route, Router, type RouteSectionProps} from '@solidjs/router'
import {createEffect, ErrorBoundary, onMount, Show, untrack} from 'solid-js'
import {DarkMode} from '@/components/DarkMode'
import {DropFile} from '@/components/DropFile'
import {Keymap} from '@/components/Keymap'
import {DragArea, Layout, PageContent} from '@/components/Layout'
import {MouseCursor} from '@/components/MouseCursor'
import {Menu} from '@/components/menu/Menu'
import {InfoNavbar} from '@/components/navbar/InfoNavbar'
import {CanvasPage, NewCanvasPage} from '@/components/pages/CanvasPage'
import {ChatPage} from '@/components/pages/ChatPage'
import {CodePage, NewCodePage} from '@/components/pages/CodePage'
import {DirPage} from '@/components/pages/DirPage'
import {EditorPage, NewEditorPage} from '@/components/pages/EditorPage'
import {Redirect} from '@/components/pages/Redirect'
import {ResizeWindow} from '@/components/ResizeWindow'
import {Variables} from '@/components/Variables'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {useBeforeLeave} from '@/hooks/use-before-leave'
import {setAlwaysOnTop} from '@/remote/app'
import {startLanguageServer} from '@/remote/copilot'
import {info} from '@/remote/log'
import {show, updateWindow} from '@/remote/window'
import {createCtrl} from '@/services'
import {StateContext} from '@/state'
import type {State} from '@/types'
import {ChatSidebar} from './assistant/ChatSidebar'
import {Dialogs} from './dialog/Dialogs'
import {GeneralError} from './Error'
import {Title} from './pages/Title'

type Ctrl = ReturnType<typeof createCtrl>

interface Props {
  state: State
  onCtrlReady?: (ctrl: Ctrl) => void
}

export const Main = (props: Props) => {
  const Root = (p: RouteSectionProps) => {
    let layoutRef!: HTMLDivElement
    const ctrl = createCtrl(props.state)
    props.onCtrlReady?.(ctrl)

    info(`Render root (pathname=${ctrl.locationService.pathname})`)

    onMount(async () => {
      ctrl.appService.layoutRef = layoutRef

      if (isTauri() && ctrl.store.window) {
        await updateWindow(ctrl.store.window)
      }

      if (isTauri() && ctrl.store.config?.alwaysOnTop) {
        await setAlwaysOnTop(true)
      }

      if (isTauri() && ctrl.store.ai?.copilot?.user) {
        // takes about 1.5s
        void startLanguageServer()
      }

      // cleanup deleted items
      await DB.cleanup()

      if (isTauri()) {
        await show()
      }
    })

    useBeforeLeave(async () => {
      await ctrl.locationService.setLastLocation({
        pathname: ctrl.locationService.pathname,
      })
    })

    createEffect((prev) => {
      if (!prev) return ctrl.store.config.theme?.code
      untrack(() => {
        for (const f of ctrl.fileService.files) {
          if (!f.editorView && !f.codeEditorView) continue
          if (f.code) ctrl.codeService.updateConfig(f)
          else ctrl.editorService.updateEditorState(f)
        }
      })

      return ctrl.store.config.theme?.code
    })

    return (
      <StateContext.Provider value={ctrl}>
        <Variables />
        <ErrorBoundary fallback={(error) => <GeneralError error={error} />}>
          <Layout ref={layoutRef} data-testid="initialized">
            <Menu />
            <PageContent>
              <InfoNavbar />
              {p.children}
            </PageContent>
            <Show when={isTauri()}>
              <DragArea data-tauri-drag-region="true" />
            </Show>
            <MouseCursor />
            <ChatSidebar />
            <DropFile />
            <Keymap />
            <ResizeWindow />
            <DarkMode />
            <Dialogs />
            <Title />
          </Layout>
        </ErrorBoundary>
      </StateContext.Provider>
    )
  }

  return (
    <Router root={Root}>
      <Route path="/editor" component={NewEditorPage} />
      <Route path="/editor/:id" component={EditorPage} />

      <Route path="/canvas" component={NewCanvasPage} />
      <Route path="/canvas/:id" component={CanvasPage} />

      <Route path="/code" component={NewCodePage} />
      <Route path="/code/:id" component={CodePage} />

      <Route path="/dir" component={DirPage} />

      <Route path="/assistant" component={ChatPage} />
      <Route path="/assistant/:id" component={ChatPage} />

      <Route path="*" component={Redirect} />
    </Router>
  )
}
