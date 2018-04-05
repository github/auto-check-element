### <auto-check>

Input element that validates the value provided against
a endpoint. Provide a URL and a CSRF token and the autocheck
component will show validation confirmations and validation errors.

The endpoint should return:
 - a 200 HTTP status code if the provided value if valid.
 - a 422 HTTP status code if the provided value is invalid.
 - a optional error message in the body and a `Content-Type` header
   with a value of `text/html; fragment`.

```html
<auto-check src='/signup_check/username' csrf="<%= authenticity_token_for("/signup_check/username") %>">
 <input></input>
</auto-check>
```

The component will attach event listeners to the first input child element.
