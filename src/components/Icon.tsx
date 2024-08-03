import {JSXElement} from 'solid-js'
import {css} from 'solid-styled-components'

export const Icon = (props: {children: JSXElement}) => (
  <span
    class={
      'icon ' +
      css`
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
      `
    }
  >
    {props.children}
  </span>
)
