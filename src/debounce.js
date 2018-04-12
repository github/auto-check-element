export default function debounce(callback, wait) {
  let timeout
  return function debounced(...args) {
    /* eslint-disable-next-line no-invalid-this */
    const self = this
    function later() {
      clearTimeout(timeout)
      callback.apply(self, args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
