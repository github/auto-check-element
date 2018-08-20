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
  })

  describe('requesting server results', function() {
    beforeEach(function() {
      const container = document.createElement('div')
      container.innerHTML = `
        <auto-check csrf="foo" src="/success">
          <input />
        </auto-check>`
      document.body.append(container)
    })

    afterEach(function() {
      document.body.innerHTML = ''
    })

    it('emits a send event on input', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('input'))
      input.addEventListener('autocheck:send', () => {
        done()
      })
    })

    it('emits a send event on change', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('autocheck:send', () => {
        done()
      })
    })

    it('emits a success event when server returns a non error response', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('autocheck:success', () => {
        done()
      })
    })

    it('emits a success event with message when server returns a non error response', function() {
      return new Promise(resolve => {
        const input = document.querySelector('input')
        input.value = 'hub'
        input.dispatchEvent(new InputEvent('change'))
        input.addEventListener('autocheck:success', event => {
          resolve(event.detail.message)
        })
      }).then(result => {
        assert.equal('This is a warning', result)
      })
    })

    it('emits a error event when server returns a error response', function(done) {
      const autoCheck = document.querySelector('auto-check')
      const input = document.querySelector('input')
      autoCheck.src = '/fail'
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('autocheck:error', () => {
        done()
      })
    })

    it('emits a error event when server returns a error response', function() {
      return new Promise(resolve => {
        const autoCheck = document.querySelector('auto-check')
        const input = document.querySelector('input')
        autoCheck.src = '/fail'
        input.value = 'hub'
        input.dispatchEvent(new InputEvent('change'))
        input.addEventListener('autocheck:error', () => {
          resolve(event.detail.message)
        })
      }).then(result => {
        assert.equal('This is a error', result)
      })
    })

    it('emits a complete event at the end of the lifecycle', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('autocheck:complete', () => {
        done()
      })
    })

    it('emits a send event before checking if there is a duplicate request', function(done) {
      const autoCheckElement = document.querySelector('auto-check')
      const input = autoCheckElement.querySelector('input')

      let counter = 2
      input.addEventListener('autocheck:send', () => {
        if (counter === 2) {
          done()
        } else {
          counter += 1
        }
      })

      input.value = 'hub'
      autoCheckElement.check()
      autoCheckElement.check()
    })
  })
})
