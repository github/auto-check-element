/* @flow strict */

import debounce from './debounce'
import XHRError from './xhr-error'

const requests = new WeakMap()
const previousValues = new WeakMap()

let boundCheck

export default class AutoCheckElement extends HTMLElement {
  input: HTMLInputElement

  constructor() {
    super()
    boundCheck = debounce(check.bind(null, this), 300)
  }

  connectedCallback() {
    const input = this.querySelector('input')
    if (input instanceof HTMLInputElement) {
      this.input = input
      this.input.addEventListener('change', boundCheck)
      this.input.addEventListener('input', boundCheck)
      this.input.autocomplete = 'off'
      this.input.spellcheck = false
    }
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener('change', boundCheck)
      this.input.removeEventListener('input', boundCheck)
      this.input.setCustomValidity('')
    }
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
    this.input.required = required
    if (required) {
      this.setAttribute('required', '')
    } else {
      this.removeAttribute('required')
    }
  }
}

function check(autoCheckElement) {
  if (!autoCheckElement.src) {
    throw new Error('missing src')
  }
  if (!autoCheckElement.csrf) {
    throw new Error('missing csrf')
  }

  const body = new FormData()
  body.append('authenticity_token', autoCheckElement.csrf)
  body.append('value', autoCheckElement.input.value)

  const id = body.entries ? [...body.entries()].sort().toString() : null
  if (id && id === previousValues.get(autoCheckElement.input)) return
  previousValues.set(autoCheckElement.input, id)

  autoCheckElement.input.dispatchEvent(new CustomEvent('auto-check-send', {detail: {body}, bubbles: true}))

  if (!autoCheckElement.input.value.trim()) {
    autoCheckElement.input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
    return
  }

  const always = () => {
    autoCheckElement.dispatchEvent(new CustomEvent('loadend'))
    autoCheckElement.input.dispatchEvent(new CustomEvent('auto-check-complete', {bubbles: true}))
  }

  if (autoCheckElement.required) {
    autoCheckElement.input.setCustomValidity('Verifying…')
  }
  autoCheckElement.dispatchEvent(new CustomEvent('loadstart'))
  performCheck(autoCheckElement.input, body, autoCheckElement.src)
    .then(data => {
      autoCheckElement.dispatchEvent(new CustomEvent('load'))
      const message = data ? data.trim() : null
      if (autoCheckElement.required) {
        autoCheckElement.input.setCustomValidity('')
      }
      autoCheckElement.input.dispatchEvent(new CustomEvent('auto-check-success', {detail: {message}, bubbles: true}))
    })
    .catch(error => {
      if (autoCheckElement.required) {
        autoCheckElement.input.setCustomValidity(errorMessage(error) || 'Something went wrong')
      }
      autoCheckElement.dispatchEvent(new CustomEvent('error'))
      autoCheckElement.input.dispatchEvent(
        new CustomEvent('auto-check-error', {detail: {message: errorMessage(error)}, bubbles: true})
      )
    })
    .then(always, always)
}

function errorMessage(error: XHRError) {
  if (error.statusCode === 422 && error.responseText) {
    if (error.contentType.includes('text/html; fragment')) {
      return error.responseText
    }
  }
}

function performCheck(input, body, url) {
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

function send(xhr, body) {
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
