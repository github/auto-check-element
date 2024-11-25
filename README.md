# &lt;auto-check&gt; element

An input element that validates its value against a server endpoint.

## Installation

```
$ npm install --save @github/auto-check-element
```

## Usage

### Script

Import as a modules:

```js
import '@github/auto-check-element'
```

With a script tag:

```html
<script type="module" src="./node_modules/@github/auto-check-element/dist/index.js">
```

### Markup

```erb
<auto-check src="/signup-check/username" csrf="<%= authenticity_token_for("/signup-check/username") %>">
  <input>
</auto-check>
```

Note that in the following example the CSRF element is marked with the `data-csrf` attribute rather than `name` so that the value doesn't get posted to the backend when the element is placed in a form.

```erb
<auto-check src="/signup-check/username">
  <input>
  <input hidden data-csrf value="<%= authenticity_token_for("/signup-check/username") %>">
</auto-check>
```

## Attributes

- `src` is the server endpoint that will receive POST requests. The posted form contains a `value` parameter containing the text input to validate. Responding with a 200 OK status indicates the provided value is valid. Any other error status response indicates the provided value is invalid.
- `csrf` is the [CSRF][] token for the posted form. It's available in the request body as a `authenticity_token` form parameter.
  - You can also supply the CSRF token via a child element. See [usage](#Usage) example.
- `required` is a boolean attribute that requires the validation to succeed before the surrounding form may be submitted.
- `http-method` defaults to `POST` where data is submitted as a POST with form data. You can set `GET` and the HTTP method used will be a get with url encoded params instead.

## Events

### Network request lifecycle events

Request lifecycle events are dispatched on the `<auto-check>` element. These events do not bubble.

- `loadstart` - The server fetch has started.
- `load` - The network request completed successfully.
- `error` - The network request failed.
- `loadend` - The network request has completed.

Network events are useful for displaying progress states while the request is in-flight.

```js
const check = document.querySelector('auto-check')
const container = check.parentElement
check.addEventListener('loadstart', () => container.classList.add('is-loading'))
check.addEventListener('loadend', () => container.classList.remove('is-loading'))
check.addEventListener('load', () => container.classList.add('is-success'))
check.addEventListener('error', () => container.classList.add('is-error'))
```

### Auto-check events

**`auto-check-start`** is dispatched on when there has been input in the element. In `event.detail` you can find:

- `setValidity`: A function to provide a custom failure message on the input. By default it is 'Verifying…'.


```js
const input = check.querySelector('input')

input.addEventListener('auto-check-start', function(event) {
  const {setValidity} = event.detail
  setValidity('Loading validation')
})
```

**`auto-check-send`** is dispatched before the network request begins. In `event.detail` you can find:

- `body`: The FormData request body to modify before the request is sent.


```js
const input = check.querySelector('input')

input.addEventListener('auto-check-send', function(event) {
  const {body} = event.detail
  body.append('custom_form_data', 'value')
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

**`auto-check-complete`** is dispatched after either the success or error events to indicate the end of the auto-check lifecycle.

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
[polyfill]: https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements

## Development

```
npm install
npm test
```

For local development, uncomment the line at the bottom of `examples/index` and serve the page using `npx serve`.

## License

Distributed under the MIT license. See LICENSE for details.
