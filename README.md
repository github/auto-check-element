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

## Attributes

- `src` is the server endpoint that will receive POST requests. The posted form contains a `value` parameter containing the text input to validate. Responding with a 200 OK status indicates the provided value is valid. Any other error status response indicates the provided value is invalid.
- `csrf` is the [CSRF][] token for the posted form. It's available in the request body as a `authenticity_token` form parameter.
- `required` is a boolean attribute that requires the validation to succeed before the surrounding form may be submitted.

## Events

### Network request lifecycle events

```js
const check = document.querySelector('auto-check')

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
```

### Auto-check events

**`auto-check-send`** is dispatched before the network request begins. In `event.detail` you can find:

- `body`: The FormData request body to modify before the request is sent.
- `setValidity`: A function to provide a custom validation message while the request is in-flight. By default it is 'Verifying…'.


```js
const input = check.querySelector('input')

input.addEventListener('auto-check-send', function(event) {
  const {body, setValidity} = event.detail
  body.append('custom_form_data', 'value')
  setValidity('Checking with server…')
})
```

**`auto-check-success`** is dispatched when the server responds with 200 OK. In `event.detail` you can find:

- `response`: The successful server [Response][]. Its body can be used for displaying server-provided messages.

```js
input.addEventListener('auto-check-success', async function(event) {
  const message = await event.detail.response.text()
  console.log('Validation passed', message)
})
```

**`auto-check-error`** is dispatched when the server responds with a 400 or 500 range error status. In `event.detail` you can find:

- `response`: The failed server [Response][]. Its body can be used for displaying server-provided messages.
- `setValidity`: A function to provide a custom failure message on the input. By default it is 'Validation failed'.

```js
input.addEventListener('auto-check-error', async function(event) {
  const {response, setValidity} = event.detail

  setValidity('Validation failed')

  const message = await response.text()
  console.log('Validation failed', message)
})
```

**`auto-check-complete`** is dispatched after either the success or error events to indicate the end of the auto-check lifecycle. This is a convenient place for cleanup, like hiding progress spinners.

```js
input.addEventListener('auto-check-complete', function(event) {
  console.log('Validation complete', event)
})
```

[CSRF]: https://en.wikipedia.org/wiki/Cross-site_request_forgery
[Response]: https://developer.mozilla.org/en-US/docs/Web/API/Response

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
