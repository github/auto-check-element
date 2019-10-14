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
<auto-check src="/signup_check/username" csrf="<%= authenticity_token_for("/signup_check/username") %>">
 <input>
</auto-check>
```

Provide a URL and a CSRF token and the autocheck component will show validation confirmations and validation errors.

The endpoint should respond to POST requests with:
 - a 200 HTTP status code if the provided value if valid.
 - a 422 HTTP status code if the provided value is invalid.
 - a optional error message in the body and a `Content-Type` header with a value of `text/html; fragment`.

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
})
input.addEventListener('auto-check-success', async function(event) {
  const message = await event.detail.response.text()
  console.log('Validation passed', message)
})
input.addEventListener('auto-check-error', function(event) {
  const message = await event.detail.response.text()
  console.log('Validation failed', message)
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
