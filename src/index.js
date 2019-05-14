/* @flow strict */

import debounce from './debounce'
import XHRError from './xhr-error'

const requests = new WeakMap()
const previousValues = new WeakMap()

let boundCheck

export default class AutoCheckElement extends HTMLElement {
  constructor() {
    super()
    boundCheck = debounce(check.bind(null, this), 300)
  }

  connectedCallback() {
    const input = this.input
    if (!input) return

    input.addEventListener('change', boundCheck)
    input.addEventListener('input', boundCheck)
    input.autocomplete = 'off'
    input.spellcheck = false
  }

  disconnectedCallback() {
    const input = this.input
    if (!input) return

    input.removeEventListener('change', boundCheck)
    input.removeEventListener('input', boundCheck)
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
  if (!autoCheckElement.src) {
    throw new Error('missing src')
  }
  if (!autoCheckElement.csrf) {
    throw new Error('missing csrf')
  }
  const input = autoCheckElement.input
  if (!input) return

  const body = new FormData()
  body.append('authenticity_token', autoCheckElement.csrf)
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
  performCheck(input, body, autoCheckElement.src)
    .then(data => {
      autoCheckElement.dispatchEvent(new CustomEvent('load'))
      const message = data ? data.trim() : null
      if (autoCheckElement.required) {
        input.setCustomValidity('')
      }
      input.dispatchEvent(new CustomEvent('auto-check-success', {detail: {message}, bubbles: true}))
    })
    .catch(error => {
      if (autoCheckElement.required) {
        input.setCustomValidity(errorMessage(error) || 'Something went wrong')
      }
      autoCheckElement.dispatchEvent(new CustomEvent('error'))
      input.dispatchEvent(new CustomEvent('auto-check-error', {detail: {message: errorMessage(error)}, bubbles: true}))
    })
    .then(always, always)
}

function errorMessage(error: XHRError): ?string {
  if (error.statusCode === 422 && error.responseText) {
    if (error.contentType.includes('text/html; fragment')) {
      return error.responseText
    }
  }
}

function performCheck(input: HTMLInputElement, body: FormData, url: string): Promise<string> {
  const pending = requests.get(input)
  if (pending) pending.abort()

  const clear = () => requests.delete(input)

  const xhr = new XMLHttpRequest()
  requests.set(input, xhr)

  xhr.open('POST', url, true)
  xhr.setRequestHeader('Accept', 'text/html; fragment')
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
