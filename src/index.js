/* @flow strict */

import {debounce} from '@github/mini-throttle'

type Controller = AbortController | {signal: ?AbortSignal, abort: () => void}

type State = {
  check: Event => mixed,
  previousValue: ?string,
  controller: ?Controller
}

const states = new WeakMap<AutoCheckElement, State>()

export default class AutoCheckElement extends HTMLElement {
  connectedCallback() {
    const input = this.input
    if (!input) return

    const checker = debounce(check.bind(null, this), 300)
    const state = {check: checker, controller: null, previousValue: null}
    states.set(this, state)

    input.addEventListener('change', setLoadingState)
    input.addEventListener('input', setLoadingState)
    input.addEventListener('change', checker)
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

    input.removeEventListener('change', setLoadingState)
    input.removeEventListener('input', setLoadingState)
    input.removeEventListener('change', state.check)
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
    return this.getAttribute('csrf') || ''
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
  if (autoCheckElement instanceof AutoCheckElement && autoCheckElement.required) {
    input.setCustomValidity('Verifying…')
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

  if (!src || !csrf || !state) {
    if (autoCheckElement.required) {
      input.setCustomValidity('')
    }
    return
  }

  const body = new FormData()
  body.append('authenticity_token', csrf)
  body.append('value', input.value)

  const id = body.entries ? [...body.entries()].sort().toString() : null
  if (id && id === state.previousValue) return
  state.previousValue = id

  let message = 'Verifying…'
  const setValidity = text => (message = text)
  input.dispatchEvent(
    new CustomEvent('auto-check-send', {
      bubbles: true,
      detail: {body, setValidity}
    })
  )

  if (!input.value.trim()) {
    if (autoCheckElement.required) {
      input.setCustomValidity('')
    }
    input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
    return
  }

  if (autoCheckElement.required) {
    input.setCustomValidity(message)
  }

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
