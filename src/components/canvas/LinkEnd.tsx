import {For, Match, Show, Switch, createSignal, onMount} from 'solid-js'
import {Vec} from '@tldraw/editor'
import {CanvasLinkElement, File, isCanvas, isCodeFile, isFile, useState} from '@/state'
import {Icon} from '../Icon'
import {Tooltip} from '../Tooltip'
import {ReferenceElement} from '@floating-ui/dom'

export const LinkEnd = () => {
  const [, ctrl] = useState()
  const [contextMenu, setContextMenu] = createSignal<Vec | undefined>()

  const onNewFile = async (code = false, link?: CanvasLinkElement, cm?: Vec) => {
    const el = await ctrl.canvas.newFile(code, link, cm)
    await ctrl.canvas.removeDeadLinks()
    if (el) ctrl.canvasCollab.addElement(el)
    setContextMenu(undefined)
  }

  const FileName = (p: {file: File; link?: CanvasLinkElement; cm?: Vec}) => {
    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      const added = await ctrl.canvas.addFile(p.file, p.link, p.cm)
      await ctrl.canvas.removeDeadLinks()
      ctrl.canvasCollab.addElements(added ?? [])
      setContextMenu(undefined)
    }

    onMount(async () => {
      setTitle(await ctrl.file.getTitle(p.file))
    })

    return (
      <div onClick={onClick}>
        <Switch>
          <Match when={isCanvas(p.file)}>
            <Icon>gesture</Icon>
          </Match>
          <Match when={isCodeFile(p.file)}>
            <Icon>code_blocks</Icon>
          </Match>
          <Match when={!isCodeFile(p.file)}>
            <Icon>text_snippet</Icon>
          </Match>
        </Switch>
        {title()}
      </div>
    )
  }

  const getFiles = (): File[] => {
    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return []
    const tree =
      currentCanvas.parentId ? ctrl.tree.findTreeNode(currentCanvas.parentId)?.tree : undefined

    const files: File[] = []
    ctrl.tree.descendants((n) => {
      if (
        isFile(n.item) &&
        !n.item.deleted &&
        !currentCanvas.elements.find((el) => el.id === n.item.id)
      ) {
        files.push(n.item)
      }
    }, tree)

    return files
  }

  const getContextMenu = ():
    | [CanvasLinkElement | undefined, Vec | undefined, ReferenceElement]
    | undefined => {
    const deadLink = ctrl.canvas.findDeadLinks()[0]
    const cm = contextMenu()
    if (!deadLink && !cm) return

    const currentCanvas = ctrl.canvas.currentCanvas
    if (!currentCanvas) return

    const p = deadLink ? new Vec(deadLink.toX, deadLink.toY) : cm
    if (!p) return

    const {camera} = currentCanvas
    const {x, y} = Vec.FromArray(camera.point).add(p).mul(camera.zoom)

    const virtualEl = {
      getBoundingClientRect() {
        return {
          x,
          y,
          top: y,
          left: x,
          bottom: y,
          right: x,
          width: 1,
          height: 1,
        }
      },
    }

    return [deadLink, cm, virtualEl]
  }

  const onTooltipClose = async () => {
    await ctrl.canvas.removeDeadLinks()
    setContextMenu(undefined)
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#grid')) {
        return
      }

      e.preventDefault()
      setContextMenu(ctrl.canvas.getPosition([e.clientX, e.clientY]))
    }

    document.oncontextmenu = onContextMenu
  })

  return (
    <Show when={getContextMenu()} keyed>
      {([link, cm, tooltipAnchor]) => (
        <Tooltip anchor={tooltipAnchor} onClose={onTooltipClose}>
          <div onClick={() => onNewFile(false, link, cm)} data-testid="link_end_new_file">
            <Icon>post_add</Icon> New file
          </div>
          <div onClick={() => onNewFile(true, link, cm)} data-testid="link_end_new_code_file">
            <Icon>code_blocks</Icon> New code file
          </div>
          <Show when={getFiles()}>
            {(files) => (
              <>
                <hr class="divider" />
                <For each={files()}>
                  {(file: File) => <FileName file={file} link={link} cm={cm} />}
                </For>
              </>
            )}
          </Show>
        </Tooltip>
      )}
    </Show>
  )
}
