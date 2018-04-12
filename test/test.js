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
})
