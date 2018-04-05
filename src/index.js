import {addThrottledInputEventListener, removeThrottledInputEventListener} from './throttled-input'

const requests = new WeakMap()
const previousValues = new WeakMap()

class XHRError extends Error {
  constructor(status, responseText, contentType) {
    super()
    this.status = status
    this.responseText = responseText
    this.contentType = contentType
  }
}

/*
 * Enhancement to a input element that validates the input against
 * a endpoint. Provide a URL and a CSRF token and the autocheck
 * component will show validation confirmations and validation errors.
 *
 * The endpoint should return:
 *  - a 200 HTTP status code if the provided value if valid.
 *  - a 422 HTTP status code if the provided value is invalid.
 *  - a optional error message in the body and a `Content-Type` header
 *    with a value of `text/html; fragment`.
 *
 * <auto-check src='/signup_check/username' csrf="<%= authenticity_token_for("/signup_check/username") %>">
 *  <input></input>
 * </auto-check>
 *
 * The component will attach event listeners to the first input child element.
 */
class AutoCheckElement extends HTMLElement {
  constructor() {
    super()
    this.boundCheck = this.check.bind(this)
  }

  connectedCallback() {
    const input = this.querySelector('input')
    if (input instanceof HTMLInputElement) {
      this.input = input
      this.input.addEventListener('change', this.boundCheck)
      addThrottledInputEventListener(this.input, this.boundCheck, {wait: 300})
    }
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener('change', this.boundCheck)
      removeThrottledInputEventListener(this.input, this.boundCheck)
    }
  }

  get src() {
    const src = this.getAttribute('src')
    if (!src) return ''

    const link = this.ownerDocument.createElement('a')
    link.href = src
    return link.href
  }

  set src(value) {
    this.setAttribute('src', value)
  }

  get csrf() {
    return this.getAttribute('csrf') || ''
  }

  set csrf(value) {
    this.setAttribute('csrf', value)
  }

  async check() {
    if (!this.src) {
      throw new Error('missing src')
    }
    if (!this.csrf) {
      throw new Error('missing csrf')
    }

    const body = new FormData()
    body.append('authenticity_token', this.csrf) // eslint-disable-line github/authenticity-token
    body.append('value', this.input.value)

    const id = body.entries ? [...body.entries()].sort().toString() : null
    if (id && id === previousValues.get(this.input)) return
    previousValues.set(this.input, id)

    this.input.dispatchEvent(new CustomEvent('autocheck:send', {detail: {body}, bubbles: true, cancelable: true}))

    if (!this.input.value.trim()) {
      this.input.dispatchEvent(new CustomEvent('autocheck:complete', {bubbles: true, cancelable: true}))
      return
    }

    try {
      this.dispatchEvent(new CustomEvent('loadstart'))
      const data = await performCheck(this.input, body, this.src)
      this.dispatchEvent(new CustomEvent('load'))

      const warning = data ? data.trim() : null
      this.input.dispatchEvent(
        new CustomEvent('autocheck:success', {detail: {warning}, bubbles: true, cancelable: true})
      )
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error'))
      this.input.dispatchEvent(
        new CustomEvent('autocheck:error', {detail: {message: errorMessage(error)}, bubbles: true, cancelable: true})
      )
    } finally {
      this.dispatchEvent(new CustomEvent('loadend'))
      this.input.dispatchEvent(new CustomEvent('autocheck:complete', {bubbles: true, cancelable: true}))
    }
  }
}

function errorMessage(error) {
  if (error.status === 422 && error.responseText) {
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
