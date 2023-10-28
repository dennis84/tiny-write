import {createSignal, For, onCleanup, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {formatDistance} from 'date-fns'
import {Canvas, useState} from '@/state'
import {Drawer, Label} from './Menu'
import {Button, ButtonGroup, ButtonPrimary} from './Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from './Layout'
import CanvasPreview from './CanvasPreview'
import {computeTooltipPosition} from './MenuTooltip'

interface Props {
  onBack: () => void;
  onOpen: () => void;
}

export const CanvasesMenu = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal<Canvas>()
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement
  const canvases = () => store.canvases
    .filter((f) => f.lastModified)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const onOpenCanvas = (canvas: Canvas) => {
    ctrl.canvas.open(canvas.id)
    props.onOpen()
  }

  const onRemove = () => {
    const id = current()?.id
    if (id) ctrl.canvas.deleteCanvas(id)
    setCurrent(undefined)
  }

  const onNew = () => {
    ctrl.canvas.newCanvas()
  }

  const CanvasItem = (p: {canvas: Canvas}) => {
    const onTooltip = (e: MouseEvent) => {
      setCurrent(p.canvas)
      computeTooltipPosition(e.target as HTMLElement, tooltipRef, arrowRef)
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
        <div onClick={onRemove}>🗑️ Delete</div>
        <span ref={arrowRef} class="arrow"></span>
      </TooltipEl>
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
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
