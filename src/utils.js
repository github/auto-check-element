/* @flow strict */

export function getSuccessResponse(response: XMLHttpRequest): ?string {
  const contentType = response.getResponseHeader('Content-Type')
  const isHTMLFragment = contentType.includes('text/html; fragment')
  const isPlainText = contentType.includes('text/plain')
  if (response.responseText && (isPlainText || isHTMLFragment)) {
    return response.responseText
  }
}

export function getErrorResponse(response: XMLHttpRequest): {message: string, validity: string} {
  // TODO: Fetch this from a data attribute on the element.
  const defaultErrorMessage = 'Something went wrong'
  let validity = defaultErrorMessage
  let message = defaultErrorMessage

  const contentType = response.getResponseHeader('Content-Type')
  if (response.status === 422 && response.responseText) {
    if (contentType.includes('application/json')) {
      const data = JSON.parse(response.responseText)
      validity = data.text
      message = data.html
    } else if (contentType.includes('text/plain')) {
      validity = response.responseText
      message = response.responseText
    }
  }
  return {message, validity}
}
