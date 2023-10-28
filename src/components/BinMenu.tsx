import {For, Show, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {compareDesc, formatDistance} from 'date-fns'
import {File, Canvas, useState} from '@/state'
import {Drawer, Label, Sub} from './Menu'
import {ButtonGroup, Button} from './Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from './Layout'
import {Excerpt} from './FilesMenu'
import CanvasPreview from './CanvasPreview'
import {computeTooltipPosition} from './MenuTooltip'

interface Props {
  onBack: () => void;
}

export const BinMenu = (props: Props) => {
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement
  const [, ctrl] = useState()
  const [items, setItems] = createSignal<(File | Canvas)[]>([])
  const [current, setCurrent] = createSignal()

  const isFile = (it: any): it is File => it.ydoc !== undefined

  const onBack = () => {
    props.onBack()
  }

  const onRemove = async () => {
    const item = items().find((it) => it.id === current())
    if (!item) return
    if (isFile(item)) {
      await ctrl.file.deleteForever(item.id)
    } else {
      await ctrl.canvas.deleteForever(item.id)
    }

    await fetchItems()
    setCurrent(undefined)
  }

  const onRestore = async () => {
    const item = items().find((it) => it.id === current())
    if (!item) return
    if (isFile(item)) {
      await ctrl.file.restore(item.id)
    } else {
      await ctrl.canvas.restore(item.id)
    }

    await fetchItems()
    setCurrent(undefined)
  }

  const showTooltip = (e: MouseEvent, id: string) => {
    setCurrent(id)
    computeTooltipPosition(e.target as HTMLElement, tooltipRef, arrowRef)
  }

  const fetchItems = async () => {
    const files = await ctrl.file.fetchDeletedFiles()
    const canvases = await ctrl.canvas.fetchDeletedCanvases()
    const items = [...files, ...canvases]
      .sort((a, b) => compareDesc(a.lastModified ?? 0, b.lastModified ?? 0))
    setItems(items)
  }

  onMount(fetchItems)

  const FileItem = (p: {file: File}) => {
    return (
      <Card>
        <CardContent>
          <Excerpt file={p.file} />
        </CardContent>
        <CardFooter>
          <span>{formatDistance(new Date(p.file.lastModified!), new Date())}</span>
          <CardMenuButton
            selected={current() === p.file.id}
            onClick={(e: MouseEvent) => showTooltip(e, p.file.id)}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
    )
  }

  const CanvasItem = (p: {canvas: Canvas}) => {
    return (
      <Card>
        <CardContent>
          <CanvasPreview canvas={p.canvas} />
        </CardContent>
        <CardFooter>
          <span>{formatDistance(new Date(p.canvas.lastModified!), new Date())}</span>
          <CardMenuButton
            selected={current() === p.canvas.id}
            onClick={(e: MouseEvent) => showTooltip(e, p.canvas.id)}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
    )
  }

  const Tooltip = () => {
    onMount(() => {
      const listener = (e: MouseEvent) => {
        if ((e.target as Element).closest('.canvas-tooltip')) return
        setCurrent(undefined)
      }

      document.addEventListener('click', listener)
      onCleanup(() => document.removeEventListener('click', listener))
    })

    const TooltipEl = styled('div')`
      position: absolute;
      min-width: 150px;
    `

    return (
      <TooltipEl
        ref={tooltipRef}
        class="canvas-tooltip">
        <div onClick={onRestore}>🔄 Restore</div>
        <div onClick={onRemove}>⚠️ Delete forever</div>
        <span ref={arrowRef} class="arrow"></span>
      </TooltipEl>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Bin</Label>
      <Sub data-tauri-drag-region="true">
        <CardList
          data-tauri-drag-region="true"
          data-testid="deleted_list">
          <For each={items()}>
            {(it) => isFile(it) ? <FileItem file={it} /> : <CanvasItem canvas={it} />}
          </For>
        </CardList>
      </Sub>
      <ButtonGroup>
        <Button onClick={onBack}>↩ Back</Button>
      </ButtonGroup>
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
