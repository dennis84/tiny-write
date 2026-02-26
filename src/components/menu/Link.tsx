import {type JSX, Show, splitProps} from 'solid-js'
import {styled} from 'solid-styled-components'
import {IconCheckBox} from '../Icon'
import {itemCss, Keys} from './Style'

// biome-ignore format: ternary breaks ugly
const LinkEl = styled.button<{active?: boolean}>`
  ${itemCss}
  background: none;
  border: 0;
  cursor: var(--cursor-pointer);
  i {
    font-style: normal;
  }
  > .keys {
    justify-self: flex-end;
    margin-left: auto;
  }
  &:hover {
    color: var(--primary-background);
    background: var(--background-90);
    border-radius: var(--border-radius-small);
    > span i {
      position: relative;
      box-shadow: 0 3px 0 0 var(--background-40);
      top: -1px;
    }
  }
  &:active {
    > span i {
      position: relative;
      box-shadow: none;
      top: 1px;
    }
  }
  &[disabled] {
    color: var(--background-40);
    cursor: not-allowed;
  }
  ${(p) => p.active ? `
    background: var(--primary-background-20);
    border-radius: var(--border-radius);
  ` : ''}
`

type ButtonAttrs = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  checked?: boolean
  keys?: string[]
}

export const Link = (props: ButtonAttrs) => {
  const [local, others] = splitProps(props, ['checked', 'children', 'keys'])
  return (
    <LinkEl {...others}>
      {/* Wrap text in span so that margin-left:0  is not applied on icon */}
      <Show when={local.checked && typeof local.children === 'string'} fallback={local.children}>
        <span>{local.children}</span>
      </Show>
      <Show when={local.checked}>
        <IconCheckBox />
      </Show>
      <Show when={props.keys}>{(keys) => <Keys keys={keys()} />}</Show>
    </LinkEl>
  )
}
