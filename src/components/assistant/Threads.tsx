import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Thread, useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {IconAdd, IconDelete, IconEdit, IconHistory, IconMoreHoriz} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'

const TooltipFooter = styled('div')`
  margin-top: 10px;
`

const Scroller = styled('div')`
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TooltipButtonMenu = styled('span')`
  justify-self: flex-end;
  margin-left: auto;
  margin-right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-small);
  width: 30px;
  height: 30px;
  &:hover {
    background: var(--background-20);
  }
  .icon {
    margin: 0;
  }
`

const Content = styled('div')`
  heigth: 100%;
`

interface Props {
  onChange: () => void
}

export const Threads = (props: Props) => {
  const {store, inputLineService, threadService} = useState()
  const [menuTooltipAnchor, setMenuTooltipAnchor] = createSignal<HTMLElement>()
  const [submenuTooltipAnchor, setSubmenuTooltipAnchor] = createSignal<HTMLElement>()
  const [selectedThread, setSelectedThread] = createSignal<Thread>()

  const closeMenu = () => {
    setMenuTooltipAnchor(undefined)
    setSubmenuTooltipAnchor(undefined)
  }

  const onSelect = (id: string) => {
    closeMenu()
    threadService.open(id)
    props.onChange()
  }

  const onMenuClick = (e: MouseEvent) => {
    setMenuTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const onMenuClose = () => closeMenu()

  const onSubmenuClick = (e: MouseEvent, thread: Thread) => {
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    const close = submenuTooltipAnchor() === target
    setSubmenuTooltipAnchor(undefined)
    setSubmenuTooltipAnchor(close ? undefined : target)
    setSelectedThread(thread)
  }

  const onNew = () => {
    threadService.newThread()
    setSubmenuTooltipAnchor(undefined)
  }

  const onDeleteAll = async () => {
    await threadService.deleteAll()
    setSubmenuTooltipAnchor(undefined)
  }

  const onDelete = () => {
    const thread = selectedThread()
    if (!thread) return
    threadService.delete(thread)
    setSelectedThread(undefined)
    setSubmenuTooltipAnchor(undefined)
  }

  const onEdit = () => {
    const thread = selectedThread()
    if (!thread) return
    setSubmenuTooltipAnchor(undefined)
    inputLineService.setInputLine({
      value: thread.title ?? '',
      onEnter: async (value: string) => {
        const title = value.trim() || undefined
        if (title) await threadService.updateTitle(title)
      },
    })
  }

  return (
    <>
      <Button onClick={onMenuClick}>
        <IconHistory />
        Chat History
      </Button>
      <Show when={menuTooltipAnchor()}>
        <Tooltip anchor={menuTooltipAnchor()!} onClose={onMenuClose} backdrop={true}>
          <Scroller>
            <Content>
              <For each={store.threads}>
                {(t) => (
                  <TooltipButton
                    onClick={() => onSelect(t.id)}
                    class={t.id === threadService.currentThread?.id ? 'selected' : ''}
                  >
                    {t.title ?? 'Untitled'}
                    <TooltipButtonMenu onClick={(e) => onSubmenuClick(e, t)}>
                      <IconMoreHoriz />
                    </TooltipButtonMenu>
                  </TooltipButton>
                )}
              </For>
            </Content>
          </Scroller>
          <TooltipFooter>
            <ButtonGroup>
              <Button onClick={onNew}>
                <IconAdd /> New
              </Button>
              <Button onClick={onDeleteAll}>
                <IconDelete /> Delete all
              </Button>
            </ButtonGroup>
          </TooltipFooter>
        </Tooltip>
      </Show>
      <Show when={submenuTooltipAnchor()}>
        <Tooltip anchor={submenuTooltipAnchor()!} closeable={false} placement="right" offset={20}>
          <TooltipButton onClick={onEdit}>
            <IconEdit />
            Edit
          </TooltipButton>
          <TooltipButton onClick={onDelete}>
            <IconDelete />
            Delete
          </TooltipButton>
        </Tooltip>
      </Show>
    </>
  )
}
