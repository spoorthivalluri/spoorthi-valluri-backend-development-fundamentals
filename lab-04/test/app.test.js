const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs/promises')
const jwt = require('jsonwebtoken')
const { openDatabase, createApp, JWT_SECRET } = require('../app')

const request = (server, method, route, body) =>
  new Promise((resolve, reject) => {
    const address = server.address()
    const payload = body === undefined ? null : JSON.stringify(body)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path: route,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
      },
      response => {
        let data = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          data += chunk
        })
        response.on('end', () => {
          resolve({ status: response.statusCode, body: data ? JSON.parse(data) : null })
        })
      },
    )
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })

test('registration, password hashing, login success and login failures', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lab-04-'))
  const databasePath = path.join(directory, 'test.db')
  const database = await openDatabase(databasePath)
  const app = createApp(database)
  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))

  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await database.close()
    await fs.rm(directory, { recursive: true, force: true })
  })

  const registered = await request(server, 'POST', '/register', {
    username: 'ashwitha',
    name: 'Samala Ashwitha',
    password: 'secret123',
  })
  assert.equal(registered.status, 201)

  const duplicate = await request(server, 'POST', '/register', {
    username: 'ashwitha',
    name: 'Samala Ashwitha',
    password: 'another',
  })
  assert.equal(duplicate.status, 400)

  const stored = await database.get(
    'SELECT username, name, password FROM users WHERE username = ?',
    'ashwitha',
  )
  assert.equal(stored.username, 'ashwitha')
  assert.equal(stored.name, 'Samala Ashwitha')
  assert.notEqual(stored.password, 'secret123')
  assert.equal(stored.password.startsWith('$2'), true)

  const successfulLogin = await request(server, 'POST', '/login', {
    username: 'ashwitha',
    password: 'secret123',
  })
  assert.equal(successfulLogin.status, 200)
  const payload = jwt.verify(successfulLogin.body.jwt_token, JWT_SECRET)
  assert.deepEqual(payload.username, 'ashwitha')
  assert.equal('password' in payload, false)

  const unknownUser = await request(server, 'POST', '/login', {
    username: 'unknown',
    password: 'secret123',
  })
  assert.equal(unknownUser.status, 400)

  const wrongPassword = await request(server, 'POST', '/login', {
    username: 'ashwitha',
    password: 'wrong',
  })
  assert.equal(wrongPassword.status, 400)
})
