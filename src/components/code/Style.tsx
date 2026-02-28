export const isClipped = `
  &.is-clipped {
    max-height: 200px;
    overflow: hidden;
    @media print {
      max-height: inherit;
    }
  }
  &.is-clipped::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to top,
      rgb(from var(--background) r g b / 0.8) 0%,
      var(--background-0) 200px
    );
    pointer-events: none;
    border-radius: var(--border-radius);
    @media print {
      display: none;
    }
  }
`

export const codeMirror = `
  .cm-editor {
    ${isClipped}
    outline: none;
    font-size: var(--font-size);
    cursor: var(--cursor-text);
    height: 100%;
    width: 100%;
    border-radius: var(--border-radius);
    flex-direction: row;
    .cm-content, .cm-gutter {
      padding: 0;
      font-family: var(--font-family-monospace);
      font-variant-ligatures: none;
    }
    .cm-lineWrapping {
      word-break: break-all;
    }
    .cm-diagnosticText {
      white-space: pre;
    }
    .cm-scroller {
      flex-grow: 1;
      flex-shrink: 1;
      width: 100%;
      line-height: 1.5;
      -ms-overflow-style: none;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
    .cm-foldGutter {
      user-select: none;
    }
    .cm-lineNumbers {
      margin-right: 10px;
    }
    .cm-activeLineGutter {
      font-weight: bold;
    }
    &:not(.cm-focused) {
      .cm-activeLine {
        background: none;
      }
    }
    .cm-tooltip ul {
      font-family: var(--font-family-monospace);
    }
    .cm-chunkButtons {
      z-index: 1;
      button {
        cursor: var(--cursor-pointer);
        font-family: var(--font-family-monospace);
        padding: 2px 4px;
        height: 32px;
        border-radius: var(--border-radius);
      }
    }
    @media print {
      .cm-scroller {
        max-height: 100% !important;
      }
    }
  }
`

export const codeMirrorTooltip = `
  .cm-completionIcon {
    display: inline-block;
    width: var(--font-size);
    height: var(--font-size);
    vertical-align: middle;
    opacity: 1;
    font-size: 100%;
    &:after {
      content: '';
      display: inline-block;
      width: var(--font-size);
      height: var(--font-size);
      background-color: currentColor;
      -webkit-mask-image: var(--svg);
      mask-image: var(--svg);
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-size: 100% 100%;
      mask-size: 100% 100%;
    }
  }
  .cm-completionIcon-text:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23000'%3E%3Cpath fill-rule='evenodd' d='M8.001 5.5c-.366 0-.705.119-1 .313V4.5a.5.5 0 0 0-1 0v5a.5.5 0 0 0 .5.5c.217 0 .397-.14.466-.334c.303.207.654.334 1.034.334c1.103 0 2-1.009 2-2.25s-.897-2.25-2-2.25m0 3.5c-.552 0-1-.561-1-1.25s.448-1.25 1-1.25s1 .561 1 1.25S8.553 9 8.001 9' clip-rule='evenodd'/%3E%3Cpath d='M12.749 10c-1.103 0-2-1.009-2-2.25s.897-2.25 2-2.25c.143 0 1.252.105 1.252.736c0 .275-.224.5-.501.5a.57.57 0 0 1-.31-.104c-.109-.063-.226-.132-.441-.132c-.552 0-1 .561-1 1.25s.448 1.25 1 1.25c.212 0 .33-.068.438-.131a.6.6 0 0 1 .313-.104a.5.5 0 0 1 .501.499c0 .633-1.114.736-1.252.736'/%3E%3Cpath fill-rule='evenodd' d='M1.898 5.646c.093-.093.466-.396 1.354-.396c.87 0 1.749.515 1.749 1.5V9.5a.5.5 0 0 1-.855.351a2.6 2.6 0 0 1-.895.149c-1.313 0-2-.754-2-1.5s.687-1.5 2-1.5c.302 0 .546.023.75.056V6.75c0-.494-.72-.5-.75-.5c-.463 0-.65.113-.672.127l-.002.001a.483.483 0 0 1-.693-.013a.515.515 0 0 1 .014-.719M3.252 8c-.649 0-1 .258-1 .5s.351.5 1 .5c.447 0 .657-.115.75-.189v-.737A3 3 0 0 0 3.252 8' clip-rule='evenodd'/%3E%3C/g%3E%3C/svg%3E");
  }
  .cm-completionIcon-method:after,
  .cm-completionIcon-function:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M4.697 5.04a.5.5 0 0 0-.394.92L7.5 7.33v3.17a.5.5 0 0 0 1 0V7.33l3.197-1.37a.5.5 0 1 0-.394-.92L8 6.456zm4.38-3.661a3 3 0 0 0-2.154 0L1.962 3.287A1.5 1.5 0 0 0 1 4.687v6.626a1.5 1.5 0 0 0 .962 1.4l4.961 1.909a3 3 0 0 0 2.154 0l4.962-1.909a1.5 1.5 0 0 0 .961-1.4V4.687a1.5 1.5 0 0 0-.961-1.4zm-1.795.933a2 2 0 0 1 1.436 0L13.68 4.22a.5.5 0 0 1 .32.467v6.626a.5.5 0 0 1-.32.467l-4.962 1.908a2 2 0 0 1-1.436 0L2.321 11.78A.5.5 0 0 1 2 11.313V4.687a.5.5 0 0 1 .32-.467z'/%3E%3C/svg%3E");
  }
  .cm-completionIcon-class:after,
  .cm-completionIcon-struct:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M13.207 10.5a1 1 0 0 0-1.414 0l-.5.5H9V7h1.363a.99.99 0 0 0 .137 1.207l.793.793a1 1 0 0 0 1.414 0L14 7.707a1 1 0 0 0 0-1.414l-.793-.793a1 1 0 0 0-1.414 0l-.5.5H6.707l.793-.793a1 1 0 0 0 0-1.414L6.207 2.5a1 1 0 0 0-1.414 0L1.5 5.793a1 1 0 0 0 0 1.414L2.793 8.5a1 1 0 0 0 1.414 0l1.5-1.5H8v4.5a.5.5 0 0 0 .5.5h1.863a.99.99 0 0 0 .137 1.207l.793.793a1 1 0 0 0 1.414 0L14 12.707a1 1 0 0 0 0-1.414zM3.5 7.793L2.207 6.5L5.5 3.207L6.793 4.5zM13.293 7L12 8.293l-.793-.793L12.5 6.207zM12 13.293l-.793-.793l1.293-1.293l.793.793z'/%3E%3C/svg%3E");
  }
  .cm-completionIcon-property:after,
  .cm-completionIcon-variable:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23000'%3E%3Cpath d='m11.279 5.79l-2.48-.724a1 1 0 0 0-.631.024l-3.52 1.32A1.005 1.005 0 0 0 4 7.347V9.14c0 .43.274.812.684.948l2.481.827a1 1 0 0 0 .694-.021l3.517-1.43A.99.99 0 0 0 12 8.54V6.75c0-.441-.297-.836-.721-.96M11 8.539L7.483 9.968L5 9.14V7.347l3.521-1.32L11 6.75zM7.48 7.467l1.327-.553a.5.5 0 0 1 .654.269a.5.5 0 0 1-.27.654l-1.192.497v.292a.5.5 0 0 1-1 0V8.36l-.408-.136a.5.5 0 1 1 .317-.948z'/%3E%3Cpath d='M12.5 14h-1a.5.5 0 0 1 0-1h1a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 1 0-1h1c.827 0 1.5.673 1.5 1.5v9c0 .827-.673 1.5-1.5 1.5M5 13.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h1a.5.5 0 0 0 0-1h-1C2.673 2 2 2.673 2 3.5v9c0 .827.673 1.5 1.5 1.5h1a.5.5 0 0 0 .5-.5'/%3E%3C/g%3E%3C/svg%3E");
  }
  .cm-completionIcon-interface:after,
  .cm-completionIcon-type:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M11.5 4.5c-1.758 0-3.204 1.308-3.449 3H4.929C4.705 6.64 3.929 6 3 6c-1.103 0-2 .897-2 2s.897 2 2 2c.929 0 1.705-.64 1.929-1.5h3.122c.245 1.692 1.691 3 3.449 3c1.93 0 3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5M3 9a1.001 1.001 0 0 1 0-2a1.001 1.001 0 0 1 0 2m8.5 1.5A2.503 2.503 0 0 1 9 8c0-1.378 1.121-2.5 2.5-2.5S14 6.622 14 8s-1.121 2.5-2.5 2.5'/%3E%3C/svg%3E");
  }
  .cm-completionIcon-namespace:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M5 2a2 2 0 0 0-2 2v2.005c0 .53-.008.794-.09.997c-.062.156-.194.331-.634.55a.5.5 0 0 0 0 .895c.44.22.572.395.635.551c.081.204.089.47.089 1.002v2a2 2 0 0 0 2 2a.5.5 0 0 0 0-1a1 1 0 0 1-1-1V9.941c0-.449 0-.91-.16-1.314A1.7 1.7 0 0 0 3.4 8c.196-.18.342-.384.44-.626C4 6.971 4 6.51 4 6.063V4a1 1 0 0 1 1-1a.5.5 0 0 0 0-1m6 0a2 2 0 0 1 2 2v2.005c0 .53.008.794.09.997c.062.156.194.331.634.55a.5.5 0 0 1 0 .895c-.44.22-.572.395-.635.551c-.081.204-.089.47-.089 1.002v2a2 2 0 0 1-2 2a.5.5 0 0 1 0-1a1 1 0 0 0 1-1V9.941c0-.449 0-.91.16-1.314A1.7 1.7 0 0 1 12.6 8a1.7 1.7 0 0 1-.44-.626C12 6.971 12 6.51 12 6.063V4a1 1 0 0 0-1-1a.5.5 0 0 1 0-1'/%3E%3C/svg%3E");
  }
  .cm-completionIcon-constant:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23000'%3E%3Cpath fill-rule='evenodd' d='M4.5 2A2.5 2.5 0 0 0 2 4.5v7A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 11.5 2zM3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5z' clip-rule='evenodd'/%3E%3Cpath d='M5 6.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5M10.5 9h-5a.5.5 0 1 0 0 1h5a.5.5 0 0 0 0-1'/%3E%3C/g%3E%3C/svg%3E");
  }
  .cm-completionIcon-keyword:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23000'%3E%3Cpath d='M9.5 14a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm-3-3a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1zm7 0a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm-5-3a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm5 0a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1z'/%3E%3Cpath fill-rule='evenodd' d='M9 2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM3 5h6V3H3z' clip-rule='evenodd'/%3E%3Cpath d='M13.5 4a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z'/%3E%3C/g%3E%3C/svg%3E");
  }
  .cm-completionIcon-copilot:after {
    --svg: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23000'%3E%3Cpath d='M6.25 9.037a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75m3.5 0a.75.75 0 0 1 .75.75v1.501a.75.75 0 0 1-1.5 0V9.787a.75.75 0 0 1 .75-.75'/%3E%3Cpath fill-rule='evenodd' d='M8.139 1.807c.682-.731 1.738-.9 2.944-.765c1.23.137 2.145.528 2.724 1.26c.566.716.693 1.615.693 2.485c0 .572-.053 1.148-.254 1.656c.066.228.098.429.126.612q.018.113.037.218c.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065q.019-.105.036-.218c.029-.183.06-.384.126-.612c-.201-.508-.254-1.084-.254-1.656c0-.87.128-1.77.693-2.484c.58-.733 1.494-1.124 2.724-1.261c1.206-.134 2.262.034 2.944.765q.074.079.14.165c.043-.057.093-.113.142-.165M8 6.303a3.3 3.3 0 0 1-.544.743c-.65.664-1.563.991-2.71.991c-.652 0-1.236-.081-1.727-.291l-.023.116v4.255c.42.323 2.722 1.433 5.002 1.433s4.584-1.11 5.002-1.433V7.862l-.023-.116c-.49.21-1.075.291-1.727.291c-1.146 0-2.059-.327-2.71-.991A3.2 3.2 0 0 1 8 6.303M6.762 2.83c-.193-.206-.637-.413-1.682-.297c-1.019.113-1.479.404-1.713.7c-.247.312-.369.79-.369 1.554c0 .793.129 1.171.308 1.371c.162.181.519.379 1.442.379c.853 0 1.339-.235 1.638-.54c.315-.322.527-.827.617-1.553c.117-.935-.037-1.395-.241-1.614m4.155-.297c-1.044-.116-1.488.091-1.68.297c-.205.219-.36.68-.243 1.614c.091.726.303 1.231.618 1.553c.3.305.784.54 1.638.54c.922 0 1.28-.198 1.442-.379c.18-.2.308-.578.308-1.371c0-.765-.123-1.242-.37-1.554c-.233-.296-.693-.587-1.713-.7' clip-rule='evenodd'/%3E%3C/g%3E%3C/svg%3E");
  }
  .cm-tooltip {
    background: var(--tooltip-background);
    border-radius: var(--border-radius) !important;
    border: 0 !important;
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
    font-family: var(--font-family-monospace);
    font-size: var(--font-size);
    line-height: 1.4;
    padding: 6px 8px;
    max-width: 600px;
    max-height: 100%;
    z-index: var(--z-index-above-content);
    p {
      margin: 10px 0;
    }
    pre {
      margin: 0;
      padding: 6px 8px !important;
      border-radius: var(--border-radius);
      background: var(--background-90);
    }
    a {
      color: var(--primary-background);
    }
    ul {
      max-height: 320px !important; /* up to 10 items */
      &::-webkit-scrollbar {
        display: none;
      }
      li {
        padding: 6px 8px !important;
        margin: 0;
        min-height: 32px;
        cursor: var(--cursor-pointer);
        border-radius: var(--border-radius);
        &:hover, &.selected {
          background: var(--primary-background);
          color: var(--primary-foreground);
        }
      }
    }
  }
`
