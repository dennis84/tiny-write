import {createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {formatDate, isToday} from 'date-fns'
import {Thread, useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {IconAdd, IconDelete, IconEdit, IconHistory, IconMoreHoriz} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'
import {Label} from '../menu/Style'

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
    margin: 0 !important;
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
    setSubmenuTooltipAnchor(undefined)
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

  const onRename = () => {
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

  const getThreads = (): [Thread, string | undefined][] => {
    const result: [Thread, string | undefined][] = []
    let currentMonth = -1
    for (const thread of store.threads) {
      if (!thread.lastModified) continue
      if (isToday(thread.lastModified)) {
        if (!result.length) result.push([thread, 'Today'])
        else result.push([thread, undefined])
      } else {
        const month = thread.lastModified.getMonth()
        if (currentMonth !== month) {
          result.push([thread, formatDate(thread.lastModified, 'MMMM')])
          currentMonth = month
        } else {
          result.push([thread, undefined])
        }
      }
    }

    return result
  }

  return (
    <>
      <Button onClick={onMenuClick} data-testid="history">
        <IconHistory />
        History
      </Button>
      <Show when={menuTooltipAnchor()}>
        <Tooltip anchor={menuTooltipAnchor()!} onClose={onMenuClose} backdrop={false} placement="left">
          <Scroller>
            <Content>
              <For each={getThreads()}>
                {([thread, label]) => (
                  <>
                    <Show when={label}>
                      <Label>{label}</Label>
                    </Show>
                    <TooltipButton
                      onClick={() => onSelect(thread.id)}
                      class={thread.id === threadService.currentThread?.id ? 'selected' : ''}
                      data-testid="thread_item"
                    >
                      {thread.title ?? 'Untitled'}
                      <TooltipButtonMenu onClick={(e) => onSubmenuClick(e, thread)}>
                        <IconMoreHoriz />
                      </TooltipButtonMenu>
                    </TooltipButton>
                  </>
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
          <Show when={submenuTooltipAnchor()}>
            <Tooltip anchor={submenuTooltipAnchor()!} closeable={false} placement="right" offset={20}>
              <TooltipButton onClick={onRename}>
                <IconEdit />
                Rename
              </TooltipButton>
              <TooltipButton onClick={onDelete}>
                <IconDelete />
                Delete
              </TooltipButton>
            </Tooltip>
          </Show>
        </Tooltip>
      </Show>
    </>
  )
}
