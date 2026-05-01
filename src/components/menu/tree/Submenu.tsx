import {
  type Accessor,
  createContext,
  createSignal,
  For,
  type Setter,
  Show,
  useContext,
} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useDialog} from '@/hooks/use-dialog'
import type {Dialog} from '@/services/DialogService'
import {useState} from '@/state'
import {IconDelete} from '../../icons/Ui'
import {Link} from '../Link'
import {Label, Sub} from '../Style'
import {NewLink} from './NewLink'
import {HighlightContent, TreeNode} from './Style'
import {Tooltip, type TooltipState} from './Tooltip'
import {TreeItem} from './TreeItem'

export type DropPos = 'before' | 'after' | 'add' | 'open' | 'delete'

interface DropState {
  targetId?: string
  pos: DropPos
}

interface TreeUiContextValue {
  showDeleted?: boolean
  binRef: () => Element
  dropState: Accessor<DropState | undefined>
  setDropState: Setter<DropState | undefined>
  showTooltip: (opts: Partial<Dialog<TooltipState>>) => void
  closeTooltip: () => void
  currentTooltip: Accessor<Dialog<TooltipState> | undefined>
}

const TreeUiContext = createContext<TreeUiContextValue>()

// biome-ignore lint/style/noNonNullAssertion: ok here
export const useTreeUi = () => useContext(TreeUiContext)!

const Tree = (p: {childrenIds: string[]; level: number; selected?: boolean}) => (
  <TreeNode selected={p.selected}>
    <For each={p.childrenIds}>{(id) => <TreeItem id={id} level={p.level} />}</For>
  </TreeNode>
)

interface Props {
  onBin?: () => void
  showDeleted?: boolean
}

export const Submenu = (props: Props) => {
  let binRef!: HTMLButtonElement

  const {treeService} = useState()
  const [dropState, setDropState] = createSignal<DropState>()

  const [showTooltip, closeTooltip, currentTooltip] = useDialog({
    component: Tooltip,
  })

  return (
    <TreeUiContext.Provider
      value={{
        showDeleted: props.showDeleted,
        binRef: () => binRef,
        dropState,
        setDropState,
        showTooltip,
        closeTooltip,
        currentTooltip,
      }}
    >
      <Label>Storage</Label>
      <Sub data-tauri-drag-region="true">
        <Tree childrenIds={treeService.tree.rootItemIds} level={0} />
        <Show when={!props.showDeleted}>
          <NewLink />
          <Link
            ref={binRef}
            onClick={props.onBin}
            data-testid="bin"
            active={dropState()?.pos === 'delete'}
          >
            <IconDelete /> Bin
          </Link>
        </Show>
      </Sub>
      <Show when={dropState()?.pos === 'open'}>
        <Portal mount={document.getElementById('content') ?? undefined}>
          <HighlightContent />
        </Portal>
      </Show>
    </TreeUiContext.Provider>
  )
}
