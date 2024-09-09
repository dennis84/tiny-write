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
