import React, {MouseEvent, SyntheticEvent, ReactNode} from 'react'
import {freestyle} from '../styles'

const container = freestyle.registerStyle({
  'position': 'fixed',
  'top': '0',
  'bottom': '0',
  'left': '0',
  'right': '0',
  'z-index': '9007199254740991',
  'outline': '0',
  'overflow-x': 'hidden',
  'overflow-y': 'auto',
  'background': 'rgba(74, 74, 74, 0.8)',
  'display': 'flex',
  'justify-content': 'center',
  'align-items': 'center',
})

const content = freestyle.registerStyle({
  'width': '450px',
  'height': 'auto !important',
  'background': '#fff',
  'border-radius': '4px',
  '@media screen and (max-width: 767px)': {
    'position': 'absolute',
    'left': '0',
    'bottom': '0',
    'width': '100%',
    'margin': '0',
    'border-radius': '0',
  }
})

const header = freestyle.registerStyle({
  'background': '#fff',
  'height': '64px',
  'display': 'flex',
  'align-items': 'center',
  'padding': '0 24px',
  'border-top-left-radius': '4px',
  'border-top-right-radius': '4px',
  'border-bottom': '1px solid #ccc',
  'h3': {
    'font-size': '24px',
    'font-weight': '500',
    'color': '#4a4a4a',
    'margin': '0',
  },
  'button': {
    'display': 'inline-flex',
    'background': 'none',
    'border': '0',
    'outline': '0',
    'padding': '0',
    'cursor': 'pointer',
    'justify-self': 'flex-end',
    'margin-left': 'auto',
  },
  '@media screen and (max-width: 767px)': {
    'height': '56px',
    'padding': '0 16px',
    'font-size': '18px',
  }
})

const body = freestyle.registerStyle({
  'padding': '24px',
  'overflow-y': 'auto',
  'max-height': 'calc(90vh - 160px)',
  'box-shadow': 'inset 0 10px 10px -12px rgba(0,0,0,0.5), inset 0 -10px 10px -12px rgba(0,0,0,0.5)',
  'border-radius': '4px',
  '&:before, &:after': {
    'content': '""',
    'position': 'relative',
    'z-index': '1',
    'display': 'block',
    'height': '24px',
  },
  '&:before': {
    'background': 'linear-gradient(#fff, #fff 50%, transparent)',
    'margin': '-24px -24px 0 -24px',
  },
  '&:after': {
    'background': 'linear-gradient(to top, #fff, #fff 50%, transparent)',
    'margin': '0 -24px -24px -24px',
  },
  '@media screen and (max-width: 767px)': {
    'padding': '16px',
    'max-height': 'calc(100vh - 136px)',
    '&:before': {
      'margin': '-16px -16px 0 -16px',
      'height': '16px',
    },
    '&:after': {
      'margin': '0 -16px -16px -16px',
      'height': '16px',
    }
  }
})

const footer = freestyle.registerStyle({
  'display': 'flex',
  'justify-content': 'flex-end',
  'padding': '24px',
  'border-top': '1px solid #ccc',
  'button:not(:last-child)': {
    'margin-right': '24px',
  },
  '@media screen and (max-width: 767px)': {
    'padding': '16px',
    'justify-content': 'center',
    'button': {
      'width': '100%',
      '&:not(:last-child)': {
        'margin-right': '16px',
      },
    },
  },
})

interface ModalProps {
  onBackgroundClick?: (e: SyntheticEvent) => void;
  children?: ReactNode;
}

interface Props {
  children?: ReactNode;
}

export const ModalHeader = (props: Props) => (
  <div className={header}>{props.children}</div>
)

export const ModalBody = (props: Props) => (
  <div className={body}>{props.children}</div>
)

export const ModalFooter = (props: Props) => (
  <div className={footer}>{props.children}</div>
)

export const Modal = (props: ModalProps) => {
  const onBackgroundClick = (e: MouseEvent<HTMLElement>) => {
    if (props.onBackgroundClick && e.target === e.currentTarget) {
      props.onBackgroundClick(e);
    }
  };

  return (
    <div className={container} onClick={onBackgroundClick}>
      <div className={content}>{props.children}</div>
    </div>
  )
}
