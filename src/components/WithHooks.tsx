export class WithHooks extends HTMLElement {
  static get observedAttributes() {
    return ['data-watch']
  }

  connectedCallback() {
    this.dispatchEvent(new CustomEvent('create', {}))
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === null) {
      return
    }

    this.dispatchEvent(new CustomEvent('update', {
      detail: {oldValue, newValue}
    }))
  }
}
