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

    it('emits send event on input', function(done) {
      const input = document.querySelector('auto-check input')
      input.addEventListener('auto-check-send', () => done())
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
    })

    it('emits send event on change', function(done) {
      const input = document.querySelector('auto-check input')
      input.addEventListener('auto-check-send', () => done())
      triggerChange(input, 'hub')
    })

    it('emits success event when server responds with 200 OK', async function() {
      const input = document.querySelector('auto-check input')
      triggerChange(input, 'hub')
      const event = await once(input, 'auto-check-success')
      const result = await event.detail.response.text()
      assert.equal('This is a warning', result)
    })

    it('emits error event when server returns an error response', async function() {
      const autoCheck = document.querySelector('auto-check')
      const input = autoCheck.querySelector('input')
      autoCheck.src = '/fail'
      triggerChange(input, 'hub')
      const event = await once(input, 'auto-check-error')
      const result = await event.detail.response.text()
      assert.equal('This is an error', result)
    })

    it('customizes the error message', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      autoCheck.required = true
      const input = autoCheck.querySelector('input')
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
      const input = autoCheck.querySelector('input')
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

    it('sets required input as invalid when empty', function() {
      const checker = document.querySelector('auto-check')
      checker.required = true
      assert.isFalse(checker.querySelector('input').checkValidity())
    })

    it('sets required input as invalid while the request is in-flight', async function() {
      const checker = document.querySelector('auto-check')
      checker.required = true
      const input = checker.querySelector('input')
      triggerChange(input, 'hub')
      await once(checker, 'loadstart')
      assert.isFalse(input.checkValidity())
    })

    it('sets required input as invalid on failed server response', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      autoCheck.src = '/fail'
      const input = autoCheck.querySelector('input')
      triggerChange(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isFalse(input.checkValidity())
    })

    it('sets required input as valid on successful server response', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      const input = autoCheck.querySelector('input')
      triggerChange(input, 'hub')
      await once(input, 'auto-check-complete')
      assert.isTrue(input.checkValidity())
    })

    it('skips validation if required attribute is not present', async function() {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      const input = autoCheck.querySelector('input')
      input.value = 'hub'
      assert.isTrue(input.checkValidity())
      input.dispatchEvent(new InputEvent('change'))
      await once(input, 'auto-check-complete')
      assert.isTrue(input.checkValidity())
    })

    it('emits complete event at the end of the lifecycle', function(done) {
      const input = document.querySelector('auto-check input')
      input.addEventListener('auto-check-complete', () => done())
      triggerChange(input, 'hub')
    })

    it('emits send event before checking if there is a duplicate request', function(done) {
      const input = document.querySelector('auto-check input')

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
