import {JSX, splitProps} from 'solid-js'
import {css} from '@emotion/css'
import {background, foreground, primaryBackground, font, selection} from '../config'
import {Config} from '../state'

export type Styled = {
  children?: JSX.Element;
  config: Config;
  [key: string]: any;
}

export const Layout = (props: Styled) => {
  const [local, others] = splitProps(props, ['config', 'children'])
  return (
    <div {...others} class={css`
      background: ${background(local.config)};
      display: flex;
      width: 100%;
      height: 100%;
      font-family: ${font(local.config)};
      font-size: 18px;
      color: ${foreground(local.config)};
      position: relative;
      .drop-cursor {
        background: ${primaryBackground(local.config)} !important;
        height: 4px !important;
        opacity: 0.5;
      }
      .mouse-cursor-container {
        position: fixed;
        overflow: hidden;
        width: 100vw;
        height: 100vw;
        user-select: none;
        pointer-events: none;
        .mouse-cursor {
          position: absolute;
          height: 10px;
          margin-left: -15px;
          z-index: 20;
          pointer-events: none;
          user-select: none;
          span {
            position: absolute;
            display: inline-flex;
            align-items: center;
            height: 20px;
            top: 20px;
            right: 0;
            line-height: 0;
            white-space: nowrap;
            padding: 4px;
            font-family: 'iA Writer Mono';
            font-size: 12px;
            border-radius: 4px;
          }
          &::before, &::after {
            content: '';
            transform: rotate(148deg);
            position: absolute;
            width: 10px;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 10px solid var(--user-background);
          }
          &::before {
            transform: rotate(148deg);
            left: 0
          }
          &::after {
            transform: rotate(-77deg);
            left: -1px;
            top: -1px;
          }
        }
      }
      .autocomplete {
        position: absolute;
        font-size: ${local.config.fontSize}px;
        font-family: ${font(local.config)};
        color: ${foreground(local.config)};
        line-height: ${local.config.fontSize * 1.6}px;
        border: 1px solid ${foreground(local.config)}4c;
        border-radius: 3px;
        background: ${background(local.config)};
        box-shadow: 0 2px 5px #00000033;
        div {
          padding: 5px;
        }
        div.selected {
          background: ${selection(local.config)};
        }
      }
      .yjs-cursor {
        position: relative;
        margin-left: -1px;
        margin-right: -1px;
        border-left: 1px solid black;
        border-right: 1px solid black;
        border-color: ${primaryBackground(local.config)};
        word-break: normal;
        pointer-events: none;
      }
    `}>{local.children}</div>
  )
}

export const Scroll = (props: Styled & {hide?: boolean}) => {
  const [local, others] = splitProps(props, ['config', 'hide'])
  const styles = () => local.hide ?
    css`display: none` :
    css`
      height: 100%;
      width: 100%;
      min-height: 100vh;
      max-height: 100vh;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      scrollbar-width: none;
      ::-webkit-scrollbar {
        display: none;
      }
    `
  return (
    <div {...others} class={styles()} data-tauri-drag-region="true" />
  )
}

export const Content = (props: Styled) => (
  <div class={css`
    position: relative;
    height: 100%;
    width: ${props.config.contentWidth}px;
    padding-top: 50px;
    padding-bottom: 77vh;
    overflow-y: auto;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
    code {
      font-family: '${font(props.config, {monospace: true})}';
    }
  `}>{props.children}</div>
)
