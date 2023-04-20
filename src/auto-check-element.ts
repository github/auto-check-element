import {debounce} from '@github/mini-throttle'

type Controller =
  | AbortController
  | {
      signal: AbortSignal | null
      abort: () => void
    }

type State = {
  check: (event: Event) => unknown
  controller: Controller | null
}

const states = new WeakMap<AutoCheckElement, State>()

export class AutoCheckElement extends HTMLElement {
  static define(tag = 'auto-check', registry = customElements) {
    registry.define(tag, this)
    return this
  }

  connectedCallback(): void {
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

  disconnectedCallback(): void {
    const input = this.input
    if (!input) return

    const state = states.get(this)
    if (!state) return
    states.delete(this)

    input.removeEventListener('input', setLoadingState)
    input.removeEventListener('input', state.check)
    input.setCustomValidity('')
  }

  attributeChangedCallback(name: string): void {
    if (name === 'required') {
      const input = this.input
      if (!input) return
      input.required = this.required
    }
  }

  static get observedAttributes(): string[] {
    return ['required']
  }

  get input(): HTMLInputElement | null {
    return this.querySelector('input')
  }

  get src(): string {
    const src = this.getAttribute('src')
    if (!src) return ''

    const link = this.ownerDocument!.createElement('a')
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

  get csrfField(): string {
    return this.getAttribute('csrf-field') || 'authenticity_token'
  }

  set csrfField(value: string) {
    this.setAttribute('csrf-field', value)
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
  const setValidity = (text: string) => (message = text)
  input.dispatchEvent(
    new CustomEvent('auto-check-start', {
      bubbles: true,
      detail: {setValidity},
    }),
  )

  if (autoCheckElement.required) {
    input.setCustomValidity(message)
  }
}

function makeAbortController() {
  if ('AbortController' in window) {
    return new AbortController()
  }
  return {
    signal: null,
    abort() {
      // Do nothing
    },
  }
}

async function fetchWithNetworkEvents(el: Element, url: string, options: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options)
    el.dispatchEvent(new Event('load'))
    el.dispatchEvent(new Event('loadend'))
    return response
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      el.dispatchEvent(new Event('error'))
      el.dispatchEvent(new Event('loadend'))
    }
    throw error
  }
}

async function check(autoCheckElement: AutoCheckElement) {
  const input = autoCheckElement.input
  if (!input) {
    return
  }

  const csrfField = autoCheckElement.csrfField
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
  body.append(csrfField, csrf)
  body.append('value', input.value)

  input.dispatchEvent(
    new CustomEvent('auto-check-send', {
      bubbles: true,
      detail: {body},
    }),
  )

  if (state.controller) {
    state.controller.abort()
  } else {
    autoCheckElement.dispatchEvent(new Event('loadstart'))
  }

  state.controller = makeAbortController()

  try {
    const response = await fetchWithNetworkEvents(autoCheckElement, src, {
      credentials: 'same-origin',
      signal: state.controller.signal,
      method: 'POST',
      body,
    })
    if (response.ok) {
      processSuccess(response, input, autoCheckElement.required)
    } else {
      processFailure(response, input, autoCheckElement.required)
    }
    state.controller = null
    input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
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
        response: response.clone(),
      },
    }),
  )
}

function processFailure(response: Response, input: HTMLInputElement, required: boolean) {
  // eslint-disable-next-line i18n-text/no-en
  let message = 'Validation failed'
  const setValidity = (text: string) => (message = text)
  input.dispatchEvent(
    new CustomEvent('auto-check-error', {
      bubbles: true,
      detail: {
        response: response.clone(),
        setValidity,
      },
    }),
  )

  if (required) {
    input.setCustomValidity(message)
  }
}

export default AutoCheckElement
