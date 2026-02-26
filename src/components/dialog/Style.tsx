import {styled} from 'solid-styled-components'
import {Scroll} from '../Layout'

export const DialogLayer = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #00000080;
`

interface DialogContainerProps {
  direction?: 'row' | 'column'
  gap?: number
  delay?: number
}

export const DialogContainer = styled('div')<DialogContainerProps>`
  position: absolute;
  width: max-content;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  max-height: 90vh;
  padding: 10px;
  display: flex;
  opacity: 0;
  flex-direction: ${(p) => `${p.direction ?? 'column'}`};
  gap: ${(p) => `${p.gap ?? 0}px`};
  animation: fadeIn 0.3s forwards;
  animation-delay: ${(p) => `${p.delay ?? 0}ms`};
  &::-webkit-scrollbar {
    display: none;
  }
`

export const DialogFooter = styled('div')`
  margin-top: 10px;
`

export const DialogLabel = styled('div')`
  margin-top: 10px;
  padding: 2px 6px;
  font-size: var(--menu-font-size);
  color: var(--background-50);
  font-weight: bold;
`

export const DialogScroll = styled(Scroll)`
  &::before {
    height: 60px;
    background-image: linear-gradient(
      to bottom,
      var(--tooltip-background),
      var(--background-0)
    ) !important;
  }
  &::after {
    height: 60px;
    background-image: linear-gradient(
      to top,
      var(--tooltip-background),
      var(--background-0)
    ) !important;
  }
`

export const TooltipButton = styled('div')`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 2px 6px;
  margin: 2px 0;
  min-height: 32px;
  cursor: var(--cursor-pointer);
  border-radius: var(--border-radius-small);
  &:hover,
  &.selected {
    background: var(--primary-background);
    color: var(--primary-foreground);
  }
  .icon {
    margin-right: 5px;
  }
`

export const TooltipDivider = styled('hr')`
  height: 3px;
  border: 0;
  border-radius: 5px;
  background: var(--background-80);
  margin: 5px 0;
`

export const TooltipArrow = styled('span')`
  width: 10px;
  height: 10px;
  background: var(--tooltip-background);
  position: absolute;
  transform: rotate(45deg);
`
