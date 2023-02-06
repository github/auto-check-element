import {esbuildPlugin} from '@web/dev-server-esbuild'

export default {
  files: ['./test/test.js'],
  nodeResolve: true,
  plugins: [
    esbuildPlugin({ts: true}),
    {
      name: 'my-plugin',
      serve(context) {
        if (context.request.method === 'POST' && context.request.url.startsWith('/fail')) {
          context.response.status = 422
          context.response.body = 'This is an error'
        } else if (context.request.method === 'POST' && context.request.url.startsWith('/success')) {
          context.response.status = 200
          context.response.body = 'This is a warning'
        }
      }
    }
  ]
}
