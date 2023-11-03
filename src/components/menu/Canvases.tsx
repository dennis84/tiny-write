import {createSignal, For, Show} from 'solid-js'
import {formatDistance} from 'date-fns'
import {Canvas, useState} from '@/state'
import {Drawer, Label} from './Menu'
import {Button, ButtonGroup, ButtonPrimary} from '@/components/Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from '@/components/Layout'
import CanvasPreview from './CanvasPreview'
import {Tooltip} from './Tooltip'

interface Props {
  onBack: () => void;
  onOpen: () => void;
}

export const Canvases = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal<Canvas>()
  const [toolipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()

  const canvases = () => store.canvases
    .filter((c) => c.lastModified && !c.deleted)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const onOpenCanvas = (canvas: Canvas) => {
    ctrl.canvas.open(canvas.id)
    closeTooltip()
    props.onOpen()
  }

  const onRemove = () => {
    const id = current()?.id
    if (id) ctrl.canvas.deleteCanvas(id)
    closeTooltip()
  }

  const onNew = () => {
    ctrl.canvas.newCanvas()
  }

  const closeTooltip = () => {
    setCurrent(undefined)
    setTooltipAnchor(undefined)
  }

  const CanvasItem = (p: {canvas: Canvas}) => {
    const onTooltip = (e: MouseEvent) => {
      setCurrent(p.canvas)
      setTooltipAnchor(e.target as HTMLElement)
    }

    return (
      <Card>
        <CardContent
          onClick={() => onOpenCanvas(p.canvas)}
          active={ctrl.canvas.currentCanvas?.id === p.canvas.id}
          data-testid="open_canvas"
        >
          <CanvasPreview canvas={p.canvas} />
        </CardContent>
        <CardFooter>
          <span>{formatDistance(new Date(p.canvas.lastModified!), new Date())}</span>
          <CardMenuButton
            selected={current() === p.canvas}
            onClick={onTooltip}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Canvases</Label>
      <CardList
        data-tauri-drag-region="true"
        data-testid="file_list">
        <For each={canvases()}>
          {(canvas: Canvas) => <CanvasItem canvas={canvas} />}
        </For>
      </CardList>
      <ButtonGroup>
        <Button onClick={props.onBack} data-testid="back">↩ Back</Button>
        <ButtonPrimary onClick={onNew} data-testid="new_canvas">New canvas</ButtonPrimary>
      </ButtonGroup>
      <Show when={toolipAnchor() !== undefined}>
        <Tooltip anchor={toolipAnchor()} onClose={() => closeTooltip()}>
          <div onClick={onRemove}>🗑️ Delete</div>
        </Tooltip>
      </Show>
    </Drawer>
  )
}
