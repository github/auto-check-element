import {assert} from '@esm-bundle/chai'
import '../src/index.ts'

describe('auto-check element', function () {
  describe('element creation', function () {
    it('creates from document.createElement', function () {
      const el = document.createElement('auto-check')
      assert.equal('AUTO-CHECK', el.nodeName)
    })

    it('creates from constructor', function () {
      const el = new window.AutoCheckElement()
      assert.equal('AUTO-CHECK', el.nodeName)
    })

    it('has the correct attributes', function () {
      const el = document.createElement('auto-check')
      assert.equal(el.getAttribute('autocomplete', 'off'))
      assert.equal(el.getAttribute('spellcheck', 'false'))
    })
  })

  describe('required attribute', function () {
    let checker
    let input

    beforeEach(function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success" required>
          <input>
        </auto-check>`
      document.body.append(container)

      checker = document.querySelector('auto-check')
      input = checker.querySelector('input')
    })

    afterEach(function () {
      document.body.innerHTML = ''
      checker = null
      input = null
    })

    it('invalidates empty input', function () {
      assert.isTrue(input.hasAttribute('required'))
      assert.isFalse(input.checkValidity())
    })

    it('invalidates the input element on keypress', async function () {
      const inputEvent = once(input, 'input')
      triggerInput(input, 'hub')
      await inputEvent
      assert.isFalse(input.checkValidity())
    })

    it('invalidates input request is in-flight', async function () {
      triggerInput(input, 'hub')
      await once(checker, 'loadstart')
      assert.isFalse(input.checkValidity())
    })

    it('invalidates input with failed server response', async function () {
      checker.src = '/fail'
      triggerInput(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isFalse(input.checkValidity())
    })

    it('validates input with successful server response', async function () {
      triggerInput(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isTrue(input.checkValidity())
    })

    it('customizes the in-flight message', async function () {
      checker.src = '/fail'
      const send = new Promise(resolve => {
        input.addEventListener('auto-check-start', event => {
          event.detail.setValidity('Checking with server')
          resolve()
        })
        triggerInput(input, 'hub')
      })
      await send
      assert(!input.validity.valid)
      assert.equal('Checking with server', input.validationMessage)
    })

    it('customizes the error message', async function () {
      checker.src = '/fail'
      const error = new Promise(resolve => {
        input.addEventListener('auto-check-error', event => {
          event.detail.setValidity('A custom error')
          resolve()
        })
        triggerInput(input, 'hub')
      })
      await error
      assert(!input.validity.valid)
      assert.equal('A custom error', input.validationMessage)
    })

    it('skips validation if required attribute is not present', async function () {
      checker.src = '/fail'
      checker.required = false
      input.value = 'hub'
      assert.isTrue(input.checkValidity())
      input.dispatchEvent(new InputEvent('input'))
      await once(input, 'auto-check-complete')
      assert.isTrue(input.checkValidity())
    })
  })

  describe('network lifecycle events', function () {
    let checker
    let input

    beforeEach(function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success">
          <input>
        </auto-check>`
      document.body.append(container)

      checker = document.querySelector('auto-check')
      input = checker.querySelector('input')
    })

    afterEach(function () {
      document.body.innerHTML = ''
      checker = null
      input = null
    })

    it('emits network events in order', async function () {
      const events = []
      const track = event => events.push(event.type)

      checker.addEventListener('loadstart', track)
      checker.addEventListener('load', track)
      checker.addEventListener('error', track)
      checker.addEventListener('loadend', track)

      const completed = Promise.all([once(checker, 'loadstart'), once(checker, 'load'), once(checker, 'loadend')])
      triggerInput(input, 'hub')
      await completed

      assert.deepEqual(['loadstart', 'load', 'loadend'], events)
    })
  })

  describe('auto-check lifecycle events', function () {
    let checker
    let input

    beforeEach(function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success">
          <input>
        </auto-check>`
      document.body.append(container)

      checker = document.querySelector('auto-check')
      input = checker.querySelector('input')
    })

    afterEach(function () {
      document.body.innerHTML = ''
      checker = null
      input = null
    })

    it('emits auto-check-send on input', function (done) {
      input.addEventListener('auto-check-send', () => done())
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
    })

    it('emits auto-check-send on change', function (done) {
      input.addEventListener('auto-check-send', () => done())
      triggerInput(input, 'hub')
    })

    it('emits auto-check-start on input', function (done) {
      input.addEventListener('auto-check-start', () => done())
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
    })

    it('emits auto-check-start on change', function (done) {
      input.addEventListener('auto-check-start', () => done())
      triggerInput(input, 'hub')
    })

    it('emits auto-check-send 300 milliseconds after keypress', function (done) {
      input.addEventListener('auto-check-send', () => done())
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
    })

    it('emits auto-check-success when server responds with 200 OK', async function () {
      triggerInput(input, 'hub')
      const event = await once(input, 'auto-check-success')
      const result = await event.detail.response.text()
      assert.equal('This is a warning', result)
    })

    it('emits auto-check-error event when server returns an error response', async function () {
      checker.src = '/fail'
      triggerInput(input, 'hub')
      const event = await once(input, 'auto-check-error')
      const result = await event.detail.response.text()
      assert.equal('This is an error', result)
    })

    it('emits auto-check-complete event at the end of the lifecycle', function (done) {
      input.addEventListener('auto-check-complete', () => done())
      triggerInput(input, 'hub')
    })

    it('emits auto-check-send event before checking if there is a duplicate request', function (done) {
      let counter = 2
      input.addEventListener('auto-check-send', () => {
        if (counter === 2) {
          done()
        } else {
          counter += 1
        }
      })

      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
      input.dispatchEvent(new InputEvent('input'))
    })

    it('do not emit if essential attributes are missing', async function () {
      const events = []
      checker.removeAttribute('src')
      input.addEventListener('auto-check-start', event => events.push(event.type))
      triggerInput(input, 'hub')
      assert.deepEqual(events, [])
    })
  })

  describe('csrf support', function () {
    afterEach(function () {
      document.body.innerHTML = ''
    })

    it('fetches CSRF tokens from attributes', function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success" required>
          <input>
        </auto-check>`
      document.body.append(container)
      const autoCheck = document.querySelector('auto-check')
      assert.equal(autoCheck.csrf, 'foo')
    })

    it('fetches CSRF tokens from child elements', function () {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check src="/success" required>
          <input>
          <input type="hidden" data-csrf value="foo">
        </auto-check>`
      document.body.append(container)
      const autoCheck = document.querySelector('auto-check')
      assert.equal(autoCheck.csrf, 'foo')
    })
  })
})

function once(element, eventName) {
  return new Promise(resolve => {
    element.addEventListener(eventName, resolve, {once: true})
  })
}

function triggerInput(input, value) {
  input.value = value
  return input.dispatchEvent(new InputEvent('input'))
}
