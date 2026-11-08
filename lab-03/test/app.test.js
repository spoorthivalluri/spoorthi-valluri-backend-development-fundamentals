const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { after, before, beforeEach, test } = require('node:test')
const { createApp, openDatabase } = require('../app')

let database
let server
let baseUrl
let temporaryDirectory

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'bdf-lab-03-'))
  database = await openDatabase(path.join(temporaryDirectory, 'books.db'))
  const app = createApp(database)
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(async () => {
  await database.run('DELETE FROM book')
  await database.run("DELETE FROM sqlite_sequence WHERE name = 'book'")
  await database.run(
    'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)',
    [
      'Amber River', 'A. Writer', 12, 100,
      'Blue Mountain', 'B. Writer', 20, 200,
      'Amber Sky', 'C. Writer', 30, 300,
    ],
  )
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()))
    })
  }
  if (database) {
    await database.close()
  }
  if (temporaryDirectory) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true })
  }
})

test('GET /books applies title search, sorting, pagination, and price filters', async () => {
  const response = await fetch(
    `${baseUrl}/books?search_q=Amber&order_by=price&order=DESC&limit=1&offset=0&min_price=10&max_price=25`,
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), [
    { id: 1, title: 'Amber River', author: 'A. Writer', price: 12, pages: 100 },
  ])
})

test('GET /books uses its defaults and rejects invalid query values', async () => {
  const defaults = await fetch(`${baseUrl}/books`)
  assert.equal(defaults.status, 200)
  assert.equal((await defaults.json()).length, 3)

  for (const query of [
    'order_by=title%3BDROP%20TABLE%20book',
    'order=sideways',
    'limit=0',
    'min_price=bad',
    'min_price=25&max_price=5',
  ]) {
    const response = await fetch(`${baseUrl}/books?${query}`)
    assert.equal(response.status, 400, query)
    assert.equal(typeof (await response.json()).message, 'string', query)
  }
})

test('GET /books/:bookId returns a book or the correct error status', async () => {
  const found = await fetch(`${baseUrl}/books/1`)
  assert.equal(found.status, 200)
  assert.equal((await found.json()).title, 'Amber River')

  const missing = await fetch(`${baseUrl}/books/999`)
  assert.equal(missing.status, 404)
  assert.equal(typeof (await missing.json()).message, 'string')

  const invalid = await fetch(`${baseUrl}/books/not-an-id`)
  assert.equal(invalid.status, 400)
})

test('POST /books validates input and creates a book with status 201', async () => {
  const invalidResponse = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'A Book', author: 'An Author', price: 'not numeric', pages: 120 }),
  })
  assert.equal(invalidResponse.status, 400)
  assert.equal(typeof (await invalidResponse.json()).message, 'string')

  const missingResponse = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'A Book', price: 10, pages: 120 }),
  })
  assert.equal(missingResponse.status, 400)

  const createdResponse = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: ' New Book ', author: 'New Author', price: 10.5, pages: 120 }),
  })
  assert.equal(createdResponse.status, 201)
  assert.equal((await createdResponse.json()).book.title, 'New Book')
})

test('malformed JSON returns a consistent 400 response', async () => {
  const response = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"title":',
  })
  assert.equal(response.status, 400)
  assert.equal(typeof (await response.json()).message, 'string')
})

test('PUT and DELETE return 200 for existing books and 404 for missing books', async () => {
  const updated = await fetch(`${baseUrl}/books/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated Title', author: 'A. Writer', price: 14, pages: 110 }),
  })
  assert.equal(updated.status, 200)

  const missingUpdate = await fetch(`${baseUrl}/books/999`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Missing', author: 'Nobody', price: 10, pages: 100 }),
  })
  assert.equal(missingUpdate.status, 404)

  const deleted = await fetch(`${baseUrl}/books/1`, { method: 'DELETE' })
  assert.equal(deleted.status, 200)

  const missingDelete = await fetch(`${baseUrl}/books/999`, { method: 'DELETE' })
  assert.equal(missingDelete.status, 404)
})
