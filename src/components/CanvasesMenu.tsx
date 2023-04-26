import {createSignal, For, onCleanup, onMount, Show} from 'solid-js';
import {styled} from 'solid-styled-components';
import {formatDistance} from 'date-fns';
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom';
import {Canvas, useState} from '@/state';
import {Drawer, Label} from './Menu'
import {Button, ButtonGroup} from './Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from './Layout';

interface Props {
  onBack: () => void;
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
  }

  const onRemove = () => {
    const id = current()?.id
    if (id) ctrl.canvas.deleteCanvas(id)
    setCurrent(undefined)
  }

  const CanvasItem = (p: {canvas: Canvas}) => {
    const onTooltip = (e: MouseEvent) => {
      setCurrent(p.canvas)
      computePosition(e.target as Element, tooltipRef, {
        placement: 'bottom',
        middleware: [
          offset(10),
          flip(),
          shift(),
          arrow({element: arrowRef}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`

        const side = placement.split('-')[0]
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`
          });
        }
      })
    }

    return (
      <Card>
        <CardContent
          onClick={() => onOpenCanvas(p.canvas)}
          active={ctrl.canvas.currentCanvas?.id === p.canvas.id}
          data-testid="open-canvas"
        >
          E: {p.canvas.elements.length}
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
        data-testid="file-list">
        <For each={canvases()}>
          {(canvas: Canvas) => <CanvasItem canvas={canvas} />}
        </For>
      </CardList>
      <ButtonGroup>
        <Button onClick={props.onBack} data-testid="back">↩ Back</Button>
      </ButtonGroup>
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
