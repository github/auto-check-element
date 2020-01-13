/* @flow strict */

import {debounce} from '@github/mini-throttle'

type Controller = AbortController | {signal: ?AbortSignal, abort: () => void}

type State = {
  check: Event => mixed,
  controller: ?Controller
}

const states = new WeakMap<AutoCheckElement, State>()

export default class AutoCheckElement extends HTMLElement {
  connectedCallback() {
    const input = this.input
    if (!input) return

    const checker = debounce(check.bind(null, this), 300)
    const state = {check: checker, controller: null}
    states.set(this, state)

    input.addEventListener('input', setLoadingState)
    input.addEventListener('input', checker)
    input.autocomplete = 'off'
    input.spellcheck = false
  }

  disconnectedCallback() {
    const input = this.input
    if (!input) return

    const state = states.get(this)
    if (!state) return
    states.delete(this)

    input.removeEventListener('input', setLoadingState)
    input.removeEventListener('input', state.check)
    input.setCustomValidity('')
  }

  attributeChangedCallback(name: string) {
    if (name === 'required') {
      const input = this.input
      if (!input) return
      input.required = this.required
    }
  }

  static get observedAttributes(): Array<string> {
    return ['required']
  }

  get input(): ?HTMLInputElement {
    const input = this.querySelector('input')
    return input instanceof HTMLInputElement ? input : null
  }

  get src(): string {
    const src = this.getAttribute('src')
    if (!src) return ''

    const link = this.ownerDocument.createElement('a')
    link.href = src
    return link.href
  }

  set src(value: string) {
    this.setAttribute('src', value)
  }

  get csrf(): string {
    const csrfElement = this.querySelector('[data-csrf]')
    return this.getAttribute('csrf') || (csrfElement instanceof HTMLInputElement && csrfElement.value) || ''
  }

  set csrf(value: string) {
    this.setAttribute('csrf', value)
  }

  get required(): boolean {
    return this.hasAttribute('required')
  }

  set required(required: boolean) {
    if (required) {
      this.setAttribute('required', '')
    } else {
      this.removeAttribute('required')
    }
  }
}

function setLoadingState(event: Event) {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return

  const autoCheckElement = input.closest('auto-check')
  if (!(autoCheckElement instanceof AutoCheckElement)) return

  const src = autoCheckElement.src
  const csrf = autoCheckElement.csrf
  const state = states.get(autoCheckElement)

  // If some attributes are missing we want to exit early and make sure that the element is valid.
  if (!src || !csrf || !state) {
    return
  }

  let message = 'Verifying…'
  const setValidity = text => (message = text)
  input.dispatchEvent(
    new CustomEvent('auto-check-start', {
      bubbles: true,
      detail: {setValidity}
    })
  )

  if (autoCheckElement.required) {
    input.setCustomValidity(message)
  }
}

function makeAbortController() {
  if ('AbortController' in window) {
    return new AbortController()
  }
  return {signal: null, abort() {}}
}

async function fetchWithNetworkEvents(el: Element, url: string, options: RequestOptions): Promise<Response> {
  try {
    const response = await fetch(url, options)
    el.dispatchEvent(new CustomEvent('load'))
    el.dispatchEvent(new CustomEvent('loadend'))
    return response
  } catch (error) {
    if (error.name !== 'AbortError') {
      el.dispatchEvent(new CustomEvent('error'))
      el.dispatchEvent(new CustomEvent('loadend'))
    }
    throw error
  }
}

async function check(autoCheckElement: AutoCheckElement) {
  const input = autoCheckElement.input
  if (!input) {
    return
  }

  const src = autoCheckElement.src
  const csrf = autoCheckElement.csrf
  const state = states.get(autoCheckElement)

  // If some attributes are missing we want to exit early and make sure that the element is valid.
  if (!src || !csrf || !state) {
    if (autoCheckElement.required) {
      input.setCustomValidity('')
    }
    return
  }

  if (!input.value.trim()) {
    if (autoCheckElement.required) {
      input.setCustomValidity('')
    }
    return
  }

  const body = new FormData()
  body.append('authenticity_token', csrf)
  body.append('value', input.value)

  input.dispatchEvent(
    new CustomEvent('auto-check-send', {
      bubbles: true,
      detail: {body}
    })
  )

  if (state.controller) {
    state.controller.abort()
  } else {
    autoCheckElement.dispatchEvent(new CustomEvent('loadstart'))
  }

  state.controller = makeAbortController()

  try {
    const response = await fetchWithNetworkEvents(autoCheckElement, src, {
      credentials: 'same-origin',
      signal: state.controller.signal,
      method: 'POST',
      body
    })
    if (response.status === 200) {
      processSuccess(response, input, autoCheckElement.required)
    } else {
      processFailure(response, input, autoCheckElement.required)
    }
    state.controller = null
    input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
  } catch (error) {
    if (error.name !== 'AbortError') {
      state.controller = null
      input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
    }
  }
}

function processSuccess(response: Response, input: HTMLInputElement, required: boolean) {
  if (required) {
    input.setCustomValidity('')
  }
  input.dispatchEvent(
    new CustomEvent('auto-check-success', {
      bubbles: true,
      detail: {
        response: response.clone()
      }
    })
  )
}

function processFailure(response: Response, input: HTMLInputElement, required: boolean) {
  let message = 'Validation failed'
  const setValidity = text => (message = text)
  input.dispatchEvent(
    new CustomEvent('auto-check-error', {
      bubbles: true,
      detail: {
        response: response.clone(),
        setValidity
      }
    })
  )

  if (required) {
    input.setCustomValidity(message)
  }
}

if (!window.customElements.get('auto-check')) {
  window.AutoCheckElement = AutoCheckElement
  window.customElements.define('auto-check', AutoCheckElement)
}
