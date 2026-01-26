import type {JSX} from 'solid-js'
import {useDialog} from '@/hooks/use-dialog'

interface Props {
  title: string
  children: JSX.Element
}

export const TooltipHelp = (props: Props) => {
  const [showTooltip, closeTooltip] = useDialog({
    component: () => <>{props.title}</>,
    delay: 300,
  })

  const onMouseEnter = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onMouseLeave = () => {
    closeTooltip()
  }

  return (
    <>
      {/* onClick: close tooltip on touch */}
      <span
        role="none"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onMouseLeave}
      >
        {props.children}
      </span>
    </>
  )
}
