/* @flow strict */

import debounce from './debounce'
import XHRError from './xhr-error'

const requests = new WeakMap()
const previousValues = new WeakMap()
const checkFunctions = new WeakMap<AutoCheckElement, (Event) => mixed>()

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

  const cancelled = !input.dispatchEvent(
    new CustomEvent('auto-check-send', {detail: {body}, bubbles: true, cancelable: true})
  )
  
  if (cancelled) {
    return
  }

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
  performCheck(input, body, src)
    .then(message => {
      autoCheckElement.dispatchEvent(new CustomEvent('load'))
      if (autoCheckElement.required) {
        input.setCustomValidity('')
      }
      input.dispatchEvent(new CustomEvent('auto-check-success', {detail: {message}, bubbles: true}))
    })
    .catch(error => {
      let validity = 'Something went wrong'

      if (error.statusCode === 422 && error.responseText) {
        if (error.contentType.includes('application/json')) {
          validity = JSON.parse(error.responseText).text
        } else {
          validity = error.responseText
        }
      }

      if (autoCheckElement.required) {
        input.setCustomValidity(validity)
      }
      autoCheckElement.dispatchEvent(new CustomEvent('error'))
      input.dispatchEvent(new CustomEvent('auto-check-error', {detail: {message: error.responseText}, bubbles: true}))
    })
    .then(always, always)
}

function performCheck(input: HTMLInputElement, body: FormData, url: string): Promise<string> {
  const pending = requests.get(input)
  if (pending) pending.abort()

  const clear = () => requests.delete(input)

  const xhr = new XMLHttpRequest()
  requests.set(input, xhr)

  xhr.open('POST', url, true)
  const result = send(xhr, body)
  result.then(clear, clear)
  return result
}

function send(xhr: XMLHttpRequest, body: FormData): Promise<string> {
  return new Promise((resolve, reject) => {
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText)
      } else {
        reject(new XHRError(xhr.status, xhr.responseText, xhr.getResponseHeader('Content-Type')))
      }
    }
    xhr.onerror = function() {
      reject(new XHRError(xhr.status, xhr.responseText, xhr.getResponseHeader('Content-Type')))
    }
    xhr.send(body)
  })
}

if (!window.customElements.get('auto-check')) {
  window.AutoCheckElement = AutoCheckElement
  window.customElements.define('auto-check', AutoCheckElement)
}
