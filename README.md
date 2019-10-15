# &lt;auto-check&gt; element

An input element that validates its value against a server endpoint.

## Installation

```
$ npm install --save @github/auto-check-element
```

## Usage

```js
import '@github/auto-check-element'
```

```erb
<auto-check src="/signup-check/username" csrf="<%= authenticity_token_for("/signup-check/username") %>">
  <input>
</auto-check>
```

An `<auto-check>` element validates text input, as it's entered, with the provided URL and [CSRF][] token. The server endpoint should respond to POST requests with a 200 OK status if the provided value is valid. Any other error status response indicates the provided value is invalid.

The response body is passed to event listeners to allow the host application to display custom messaging near the input field.

[CSRF]: https://en.wikipedia.org/wiki/Cross-site_request_forgery

## Events

```js
const check = document.querySelector('auto-check')

// Network request lifecycle events.
check.addEventListener('loadstart', function(event) {
  console.log('Network request started', event)
})
check.addEventListener('loadend', function(event) {
  console.log('Network request complete', event)
})
check.addEventListener('load', function(event) {
  console.log('Network request succeeded', event)
})
check.addEventListener('error', function(event) {
  console.log('Network request failed', event)
})

// Auto-check result events.
const input = check.querySelector('input')

input.addEventListener('auto-check-send', function(event) {
  console.log('Adding to FormData before network request is sent.')
  const {body} = event.detail
  body.append('custom_form_data', 'value')

  // Invalidate input while network request is live.
  event.detail.setValidity('Checking with server…')
})
input.addEventListener('auto-check-success', async function(event) {
  const message = await event.detail.response.text()
  console.log('Validation passed', message)
})
input.addEventListener('auto-check-error', function(event) {
  // Asynchronously extract text response and invalidate the input.
  const {response, setValidity} = event.detail
  setValidity(response.text())
})
input.addEventListener('auto-check-complete', function(event) {
  console.log('Validation complete', event)
})
```

## Browser support

Browsers without native [custom element support][support] require a [polyfill][].

- Chrome
- Firefox
- Safari
- Microsoft Edge

[support]: https://caniuse.com/#feat=custom-elementsv1
[polyfill]: https://github.com/webcomponents/custom-elements

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
