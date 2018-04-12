# &lt;auto-check&gt; element

An input element that validates its value against a server endpoint.

## Installation

```
$ npm install --save auto-check-element
```

## Usage

```js
import 'auto-check-element'
```

```html
<auto-check src='/signup_check/username' csrf="<%= authenticity_token_for("/signup_check/username") %>">
 <input></input>
</auto-check>
```

Provide a URL and a CSRF token and the autocheck component will show validation confirmations and validation errors.

The endpoint should return:
 - a 200 HTTP status code if the provided value if valid.
 - a 422 HTTP status code if the provided value is invalid.
 - a optional error message in the body and a `Content-Type` header with a value of `text/html; fragment`.

## Browser support

- Chrome
- Firefox
- Safari 9+
- Internet Explorer 11
- Microsoft Edge

## Development

Clone this repository and run the following to install the dependencies and run the tests.

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
