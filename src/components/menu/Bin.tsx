import {For, Show, createSignal} from 'solid-js'
import {compareDesc, formatDistance} from 'date-fns'
import {File, Canvas, useState} from '@/state'
import {Drawer, Label, Note, Sub} from './Menu'
import {ButtonGroup, Button} from '@/components/Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from '@/components/Layout'
import {Excerpt} from './Files'
import CanvasPreview from './CanvasPreview'
import {Tooltip} from './Tooltip'

interface Props {
  onBack: () => void;
}

export const Bin = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()

  const items = () => {
    const files = store.files.filter((it) => it.deleted)
    const canvases = store.canvases.filter((it) => it.deleted)
    const items = [...files, ...canvases]
      .sort((a, b) => compareDesc(a.lastModified ?? 0, b.lastModified ?? 0))
    return items
  }

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

    setCurrent(undefined)
    setTooltipAnchor(undefined)
  }

  const onRestore = async () => {
    const item = items().find((it) => it.id === current())
    if (!item) return
    if (isFile(item)) {
      await ctrl.file.restore(item.id)
    } else {
      await ctrl.canvas.restore(item.id)
    }

    setCurrent(undefined)
    setTooltipAnchor(undefined)
  }

  const showCardMenu = (e: MouseEvent, id: string) => {
    setCurrent(id)
    setTooltipAnchor(e.target as HTMLElement)
  }

  const onTooltipClose = () => {
    setCurrent(undefined)
    setTooltipAnchor(undefined)
  }

  // const fetchItems = async () => {
  //   const files = await ctrl.file.fetchDeletedFiles()
  //   const canvases = await ctrl.canvas.fetchDeletedCanvases()
  //   const items = [...files, ...canvases]
  //     .sort((a, b) => compareDesc(a.lastModified ?? 0, b.lastModified ?? 0))
  //   setItems(items)
  // }

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
            onClick={(e: MouseEvent) => showCardMenu(e, p.file.id)}
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
            onClick={(e: MouseEvent) => showCardMenu(e, p.canvas.id)}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Bin</Label>
      <Note>
        💁 Items in bin will be automatically deleted after 14 days.
      </Note>
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
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()} onClose={onTooltipClose}>
          <div onClick={onRestore}>🔄 Restore</div>
          <div onClick={onRemove}>⚠️ Delete forever</div>
        </Tooltip>
      </Show>
    </Drawer>
  )
}
