const http = require('node:http')

const port = process.env.HTTP_PORT || 3001

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end('Hello from the built-in Node.js HTTP server.')
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Node HTTP server running at http://localhost:${port}`)
})