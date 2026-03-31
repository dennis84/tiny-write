import {IconAdd} from '@/components/icons/Ui'
import {Link} from '../Link'
import {useTreeUi} from './Submenu'

export const NewLink = () => {
  let anchor!: HTMLButtonElement
  const {showTooltip, currentTooltip} = useTreeUi()
  const onNew = (e: MouseEvent) => {
    e.stopPropagation()
    showTooltip({anchor, state: {selected: undefined}})
  }

  return (
    <Link
      ref={anchor}
      active={anchor && anchor === currentTooltip()?.anchor}
      onClick={onNew}
      data-testid="new"
    >
      <IconAdd /> New
    </Link>
  )
}
