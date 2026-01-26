import {styled} from 'solid-styled-components'

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

export const DialogContainer = styled('div')`
  position: absolute;
  width: max-content;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
  display: flex;
  opacity: 0;
  flex-direction: ${(p: any) => `${p.direction ?? 'column'}`};
  gap: ${(p: any) => `${p.gap ?? 0}px`};
  animation: fadeIn 0.3s forwards;
  animation-delay: ${(p: any) => `${p.delay ?? 0}ms`};
  &::-webkit-scrollbar {
    display: none;
  }
  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
`

export const DialogFooter = styled('div')`
  margin-top: 10px;
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
  background: var(--foreground-10);
  margin: 5px 0;
`

export const TooltipArrow = styled('span')`
  width: 10px;
  height: 10px;
  background: var(--tooltip-background);
  position: absolute;
  transform: rotate(45deg);
`
