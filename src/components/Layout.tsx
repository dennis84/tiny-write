import {styled} from 'solid-styled-components'
import {codeMirrorTooltip} from './code/Style'

export const FULL_WIDTH = 500

export const Layout = styled('div')`
  cursor: var(--cursor-default);
  touch-action: none;
  background: var(--background);
  display: flex;
  width: 100%;
  height: 100%;
  font-family: var(--font-family);
  font-variant-ligatures: none;
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
    font-family: "Material Symbols Outlined";
    font-weight: normal;
    font-style: normal;
    font-size: 20px;
    display: inline-flex;
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

export const PageContent = styled('div')`
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  touch-action: none;
  overflow: hidden;
`

export const Scroll = styled('div')`
  container-type: scroll-state;
  position: relative;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  touch-action: none;
  &::-webkit-scrollbar {
    display: none;
  }
  @media print {
    overflow-y: visible;
  }
  &::before, &::after {
    content: '';
    position: sticky;
    display: block;
    height: 100px;
    width: 100%;
    align-self: flex-start;
    pointer-events: none;
    opacity: 0;
    transition: opacity 500ms ease-out 0.1s;
    z-index: var(--z-index-above-content);
  }
  &::before {
    top: 0;
    margin-bottom: -100px;
    background-image: linear-gradient(
      to bottom,
      var(--background) 0%,
      var(--background) 30%, /* extra space for navbar */
      var(--background) 30%,
      var(--background-0) 100%
    );
  }
  &::after {
    bottom: 0;
    margin-top: -100px;
    background-image: linear-gradient(
      to top,
      var(--background),
      var(--background-0)
    );
  }
  @container scroll-state(scrollable: top) {
    &::before {
      opacity: 1;
    }
  }
  @container scroll-state(scrollable: bottom) {
    &::after {
      opacity: 1;
    }
  }
`

export const CodeScroll = styled(Scroll)`
  &::before {
    background-image: linear-gradient(
      to bottom,
      var(--code-background),
      var(--background-0)
    );
  }
  &::after {
    background-image: linear-gradient(
      to top,
      var(--code-background),
      var(--background-0)
    );
  }
`

export const Content = styled('div')`
  position: relative;
  height: fit-content;
  max-width: var(--content-width);
  width: 100%;
  padding: 20px;
  padding-bottom: 77vh;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const DragArea = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10px;
  z-index: var(--z-index-above-content);
  cursor: var(--cursor-grab);
`
