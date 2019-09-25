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
      input.addEventListener('auto-check-send', () => {
        done()
      })
    })

    it('emits a send event on change', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-send', () => {
        done()
      })
    })

    it('emits a success event when server returns a non error response', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-success', () => {
        done()
      })
    })

    it('emits a success event with message when server returns a non error response', function() {
      return new Promise(resolve => {
        const input = document.querySelector('input')
        input.value = 'hub'
        input.dispatchEvent(new InputEvent('change'))
        input.addEventListener('auto-check-success', async event => {
          const message = await event.detail.response.text()
          resolve(message)
        })
      }).then(result => {
        assert.deepEqual('{"text": "This is a warning"}', result)
      })
    })

    it('emits a error event when server returns a error response', function() {
      return new Promise(resolve => {
        const autoCheck = document.querySelector('auto-check')
        const input = document.querySelector('input')
        autoCheck.src = '/fail'
        input.value = 'hub'
        input.dispatchEvent(new InputEvent('change'))
        input.addEventListener('auto-check-error', async event => {
          const message = await event.detail.response.text()
          resolve(message)
        })
      }).then(result => {
        assert.deepEqual('{"text": "This is a error"}', result)
      })
    })

    it('sets input as invalid if input is required and not filled in', function() {
      document.querySelector('auto-check').required = true
      assert.isFalse(document.querySelector('input').checkValidity())
    })

    it('sets input as invalid while the check request is inflight', function() {
      document.querySelector('auto-check').required = true
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-loadstart', () => {
        assert.isFalse(document.querySelector('input').checkValidity())
      })
    })

    it('sets input as invalid if the check request comes back with a error', function(done) {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      autoCheck.src = '/fail'
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-complete', () => {
        assert.isFalse(document.querySelector('input').checkValidity())
        done()
      })
    })

    it('sets input as valid if the check request comes back with a success', function(done) {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.required = true
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-complete', () => {
        assert.isTrue(document.querySelector('input').checkValidity())
        done()
      })
    })

    it("doesn't set input as invalid the `required` attribute isn't set", function(done) {
      const autoCheck = document.querySelector('auto-check')
      autoCheck.src = '/fail'
      const input = document.querySelector('input')
      input.value = 'hub'
      assert.isTrue(document.querySelector('input').checkValidity())
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-complete', () => {
        assert.isTrue(document.querySelector('input').checkValidity())
        done()
      })
    })

    it('emits a complete event at the end of the lifecycle', function(done) {
      const input = document.querySelector('input')
      input.value = 'hub'
      input.dispatchEvent(new InputEvent('change'))
      input.addEventListener('auto-check-complete', () => {
        done()
      })
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

    it('handles plain text responses', function() {
      return new Promise(resolve => {
        const autoCheck = document.querySelector('auto-check')
        const input = document.querySelector('input')
        autoCheck.src = '/plaintext'
        input.value = 'hub'
        input.dispatchEvent(new InputEvent('change'))
        input.addEventListener('auto-check-success', async event => {
          const message = await event.detail.response.text()
          resolve(message)
        })
      }).then(result => {
        assert.deepEqual('This is a warning', result)
      })
    })

    describe('`auto-check-error` event', function() {
      it('includes `Content-Type` header in event payload', function() {
        return new Promise(resolve => {
          const autoCheck = document.querySelector('auto-check')
          const input = document.querySelector('input')
          autoCheck.src = '/fail'
          input.value = 'hub'
          input.dispatchEvent(new InputEvent('change'))
          input.addEventListener('auto-check-error', async event => {
            const contentType = await event.detail.response.headers.get('Content-Type')
            resolve(contentType)
          })
        }).then(contentType => {
          assert.equal('application/json', contentType)
        })
      })
    })
  })
})
