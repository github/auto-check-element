/* @flow strict */

import debounce from './debounce'

const previousValues = new WeakMap()
const checkFunctions = new WeakMap<AutoCheckElement, (Event) => mixed>()
const abortControllers = new WeakMap()

class ErrorWithResponse extends Error {
  response: Response
  constructor(message, response) {
    super(message)
    this.response = response
  }
}

export default class AutoCheckElement extends HTMLElement {
  constructor() {
    super()
    checkFunctions.set(this, debounce(check.bind(null, this), 300))
  }

  connectedCallback() {
    const input = this.input
    if (!input) return

    const checkFunction = checkFunctions.get(this)
    if (!checkFunction) return

    input.addEventListener('change', checkFunction)
    input.addEventListener('input', checkFunction)
    input.autocomplete = 'off'
    input.spellcheck = false

    if ('AbortController' in window) {
      abortControllers.set(this, new AbortController())
    }
  }

  disconnectedCallback() {
    const input = this.input
    if (!input) return

    const checkFunction = checkFunctions.get(this)
    if (!checkFunction) return

    input.removeEventListener('change', checkFunction)
    input.removeEventListener('input', checkFunction)
    input.setCustomValidity('')
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
    const input = this.input
    if (!input) return

    input.required = required
    if (required) {
      this.setAttribute('required', '')
    } else {
      this.removeAttribute('required')
    }
  }
}

function check(autoCheckElement: AutoCheckElement) {
  const src = autoCheckElement.src
  if (!src) {
    throw new Error('missing src')
  }
  const csrf = autoCheckElement.csrf
  if (!csrf) {
    throw new Error('missing csrf')
  }
  const input = autoCheckElement.input
  if (!input) return

  const body = new FormData()
  body.append('authenticity_token', csrf)
  body.append('value', input.value)

  const id = body.entries ? [...body.entries()].sort().toString() : null
  if (id && id === previousValues.get(input)) return
  previousValues.set(input, id)

  input.dispatchEvent(new CustomEvent('auto-check-send', {detail: {body}, bubbles: true}))

  if (!input.value.trim()) {
    input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
    return
  }

  const always = () => {
    autoCheckElement.dispatchEvent(new CustomEvent('loadend'))
    input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
  }

  if (autoCheckElement.required) {
    input.setCustomValidity('Verifying…')
  }
  autoCheckElement.dispatchEvent(new CustomEvent('loadstart'))

  const options: RequestOptions = {body, method: 'POST'}

  // If there is a controller, it means we are already in flight.
  // Cancel that request and create a new signal.
  let controller = abortControllers.get(autoCheckElement)
  if (controller) {
    // Cancel the in-flight request.
    controller.abort()
  }

  // We need to create a new controller so we can get a new signal?
  controller = new AbortController()
  abortControllers.set(autoCheckElement, controller)

  // Set the component as being in-flight
  options.signal = controller.signal

  fetch(src, options)
    .then(response => {
      if (response.status !== 200) {
        throw new ErrorWithResponse(response.statusText, response)
      }
      return response.text()
    })
    .then(message => {
      autoCheckElement.dispatchEvent(new CustomEvent('load'))
      if (autoCheckElement.required) {
        input.setCustomValidity('')
      }
      input.dispatchEvent(new CustomEvent('auto-check-success', {detail: {message}, bubbles: true}))

      // Mark the component as not being in-flight any more.
      abortControllers.delete(autoCheckElement)
    })
    .catch(async error => {
      let validity = 'Something went wrong'

      const response = error.response
      const message = await error.response.text()
      const contentType = error.response.headers.get('Content-Type')

      if (response.status === 422 && message) {
        if (contentType.includes('application/json')) {
          validity = JSON.parse(message).text
        } else if (contentType.includes('text/plain')) {
          validity = message
        }
      }

      if (autoCheckElement.required) {
        input.setCustomValidity('Input is not valid')
      }
      autoCheckElement.dispatchEvent(new CustomEvent('error'))
      input.dispatchEvent(
        new CustomEvent('auto-check-error', {
          detail: {message, contentType},
          bubbles: true
        })
      )
      // Mark the component as not being in-flight any more.
      abortControllers.delete(autoCheckElement)
    })
    .then(always, always)
}

if (!window.customElements.get('auto-check')) {
  window.AutoCheckElement = AutoCheckElement
  window.customElements.define('auto-check', AutoCheckElement)
}
