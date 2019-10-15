describe('auto-check element', function() {
  describe('element creation', function() {
    it('creates from document.createElement', function() {
      const el = document.createElement('auto-check')
      assert.equal('AUTO-CHECK', el.nodeName)
    })

    it('creates from constructor', function() {
      const el = new window.AutoCheckElement()
      assert.equal('AUTO-CHECK', el.nodeName)
    })

    it('has the correct attributes', function() {
      const el = document.createElement('auto-check')
      assert.equal(el.getAttribute('autocomplete', 'off'))
      assert.equal(el.getAttribute('spellcheck', 'false'))
    })
  })

  describe('requesting server results', function() {
    beforeEach(function() {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success">
          <input>
        </auto-check>`
      document.body.append(container)
    })

    afterEach(function() {
      document.body.innerHTML = ''
    })

    it('emits a send event on input', function(done) {
      const input = document.querySelector('input')
      input.addEventListener('auto-check-send', () => done())
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
    })

    it('emits a send event on change', function(done) {
      const input = document.querySelector('input')
      input.addEventListener('auto-check-send', () => done())
      triggerChange(input, 'hub')
    })

    it('emits a success event when server returns a non error response', function(done) {
      const input = document.querySelector('input')
      input.addEventListener('auto-check-success', () => done())
      triggerChange(input, 'hub')
    })

    it('emits a success event with message when server returns a non error response', async function() {
      const input = document.querySelector('input')
      triggerChange(input, 'hub')
      const event = await once(input, 'auto-check-success')
      const result = await event.detail.response.text()
      assert.deepEqual('{"text": "This is a warning"}', result)
    })

    it('emits a error event when server returns a error response', async function() {
      const autoCheck = document.querySelector('auto-check')
      const input = document.querySelector('input')
      autoCheck.src = '/fail'
      triggerChange(input, 'hub')
      const event = await once(input, 'auto-check-error')
      const result = await event.detail.response.text()
      assert.deepEqual('{"text": "This is a error"}', result)
    })

    it('customizes the error message', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      autoCheck.required = true
      const input = document.querySelector('input')
      const error = new Promise(resolve => {
        input.addEventListener('auto-check-error', event => {
          event.detail.setValidity('A custom error')
          resolve()
        })
        triggerChange(input, 'hub')
      })
      await error
      assert(!input.validity.valid)
      assert.equal('A custom error', input.validationMessage)
    })

    it('customizes the in-flight message', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      autoCheck.required = true
      const input = document.querySelector('input')
      const send = new Promise(resolve => {
        input.addEventListener('auto-check-send', event => {
          event.detail.setValidity('Checking with server')
          resolve()
        })
        triggerChange(input, 'hub')
      })
      await send
      assert(!input.validity.valid)
      assert.equal('Checking with server', input.validationMessage)
    })

    it('sets input as invalid if input is required and not filled in', function() {
      document.querySelector('auto-check').required = true
      assert.isFalse(document.querySelector('input').checkValidity())
    })

    it('sets input as invalid while the check request is inflight', async function() {
      const checker = document.querySelector('auto-check')
      checker.required = true
      const input = checker.querySelector('input')
      triggerChange(input, 'hub')
      await once(checker, 'loadstart')
      assert.isFalse(input.checkValidity())
    })

    it('sets input as invalid if the check request comes back with a error', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      autoCheck.src = '/fail'
      const input = document.querySelector('input')
      triggerChange(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isFalse(document.querySelector('input').checkValidity())
    })

    it('sets input as valid if the check request comes back with a success', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      const input = document.querySelector('input')
      triggerChange(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isTrue(document.querySelector('input').checkValidity())
    })

    it('skips validation if required attribute is not present', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      const input = document.querySelector('input')
      input.value = 'hub'
      assert.isTrue(document.querySelector('input').checkValidity())
      input.dispatchEvent(new InputEvent('change'))
      await once(input, 'auto-check-complete')
      assert.isTrue(document.querySelector('input').checkValidity())
    })

    it('emits a complete event at the end of the lifecycle', function(done) {
      const input = document.querySelector('input')
      input.addEventListener('auto-check-complete', () => done())
      triggerChange(input, 'hub')
    })

    it('emits a send event before checking if there is a duplicate request', function(done) {
      const autoCheckElement = document.querySelector('auto-check')
      const input = autoCheckElement.querySelector('input')

      let counter = 2
      input.addEventListener('auto-check-send', () => {
        if (counter === 2) {
          done()
        } else {
          counter += 1
        }
      })

      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.dispatchEvent(new InputEvent('change'))
    })

    it('handles plain text responses', async function() {
      const autoCheck = document.querySelector('auto-check')
      const input = document.querySelector('input')
      autoCheck.src = '/plaintext'
      triggerChange(input, 'hub')
      const event = await once(input, 'auto-check-success')
      const result = await event.detail.response.text()
      assert.deepEqual('This is a warning', result)
    })

    describe('`auto-check-error` event', async function() {
      it('includes `Content-Type` header in event payload', async function() {
        const autoCheck = document.querySelector('auto-check')
        const input = document.querySelector('input')
        autoCheck.src = '/fail'
        triggerChange(input, 'hub')
        const event = await once(input, 'auto-check-error')
        const contentType = event.detail.response.headers.get('Content-Type')
        assert.equal('application/json', contentType)
      })
    })
  })
})

function once(element, eventName) {
  return new Promise(resolve => {
    element.addEventListener(eventName, resolve, {once: true})
  })
}

function triggerChange(input, value) {
  input.value = value
  return input.dispatchEvent(new InputEvent('change'))
}
