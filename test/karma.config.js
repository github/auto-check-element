function checker(request, response, next) {
  if (request.method === 'POST' && request.url.startsWith('/fail')) {
    response.writeHead(422)
    response.end('This is an error')
    return
  } else if (request.method === 'POST' && request.url.startsWith('/success')) {
    response.writeHead(200)
    response.end('This is a warning')
    return
  }
  next()
}

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    files: ['../dist/index.umd.js', 'test.js'],
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    middleware: ['checker'],
    plugins: [
      'karma-*',
      {
        'middleware:checker': ['value', checker]
      }
    ]
  })
}
