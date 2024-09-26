import {styled} from 'solid-styled-components'
import {codeMirrorTooltip} from './code/Style'

export const Layout = styled('div')`
  cursor: var(--cursor-default);
  touch-action: none;
  background: var(--background);
  display: flex;
  width: 100%;
  height: 100%;
  font-family: var(--font-family);
  color: var(--foreground);
  position: relative;
  overflow: hidden;
  ${codeMirrorTooltip}
  .drop-cursor {
    background: var(--primary-background) !important;
    height: 5px !important;
    border-radius: var(--border-radius);
  }
  .yjs-cursor {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    border-color: var(--primary-background);
    word-break: normal;
    pointer-events: none;
  }
  .icon {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 20px;
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;
    &.rot-90 {
      transform: rotate(90deg);
    }
  }
`

export const Scroll = styled('div')`
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  justify-content: center;
  scrollbar-width: none;
  touch-action: none;
  &::-webkit-scrollbar {
    display: none;
  }
  @media print {
    overflow-y: visible;
  }
`

export const Content = styled('div')`
  position: relative;
  height: 100%;
  width: ${(props: any) => props.config.contentWidth}px;
  padding: 50px;
  padding-bottom: 77vh;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  code {
    font-family: var(--font-family-monospace);
  }
`

export const DragArea = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30px;
  z-index: var(--z-index-above-content);
  cursor: var(--cursor-grab);
`
