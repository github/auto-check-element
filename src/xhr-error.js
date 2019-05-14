/* @flow strict */

export default class XHRError extends Error {
  statusCode: number
  responseText: string
  contentType: string

  constructor(statusCode: number, responseText: string, contentType: string) {
    super()

    this.statusCode = statusCode
    this.responseText = responseText
    this.contentType = contentType
  }
}
