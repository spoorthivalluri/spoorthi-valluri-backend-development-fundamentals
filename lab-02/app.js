const express = require('express')
const path = require('node:path')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

const app = express()
const port = process.env.PORT || 3000
const databasePath = path.join(__dirname, 'books.db')

app.use(express.json())

const sampleBooks = [
  { title: 'The Glass Orchard', author: 'Mira Solis', price: 18, pages: 284 },
  { title: 'Maps of Tomorrow', author: 'Dev Anand', price: 22, pages: 316 },
  { title: 'A River of Stars', author: 'Leena Rao', price: 16, pages: 240 },
  { title: 'The Quiet Compass', author: 'Nikhil Sen', price: 20, pages: 302 },
  { title: 'Small Worlds', author: 'Tara Menon', price: 14, pages: 198 },
  { title: 'The Last Monsoon', author: 'Arun Das', price: 24, pages: 358 },
  { title: 'Paper Kingdoms', author: 'Ira Kapoor', price: 19, pages: 276 },
  { title: 'Beyond the Banyan', author: 'Kiran Mehta', price: 17, pages: 225 },
  { title: 'The Blue Hour', author: 'Anya Dutt', price: 21, pages: 330 },
  { title: 'Letters from Elsewhere', author: 'Rohan Iyer', price: 15, pages: 212 },
]

const openDatabase = async () => {
  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  })

  await database.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      pages INTEGER NOT NULL CHECK (pages > 0)
    );
  `)

  const { count } = await database.get('SELECT COUNT(*) AS count FROM book')
  if (count === 0) {
    const insertBook = await database.prepare(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
    )

    try {
      await database.run('BEGIN TRANSACTION')
      for (const book of sampleBooks) {
        await insertBook.run(book.title, book.author, book.price, book.pages)
      }
      await database.run('COMMIT')
    } catch (error) {
      await database.run('ROLLBACK')
      throw error
    } finally {
      await insertBook.finalize()
    }
  }

  return database
}

const isValidBook = book =>
  typeof book.title === 'string' &&
  book.title.trim().length > 0 &&
  typeof book.author === 'string' &&
  book.author.trim().length > 0 &&
  Number.isInteger(book.price) &&
  book.price >= 0 &&
  Number.isInteger(book.pages) &&
  book.pages > 0

const parseBookId = value => {
  const bookId = Number(value)
  return Number.isInteger(bookId) && bookId > 0 ? bookId : null
}

let database

app.get('/', (request, response) => {
  response.json({ message: 'Books API is running. Use /books to view the collection.' })
})

app.get('/books/', async (request, response) => {
  const books = await database.all('SELECT * FROM book ORDER BY id')
  response.json(books)
})

app.get('/books/:bookId/', async (request, response) => {
  const bookId = parseBookId(request.params.bookId)
  if (bookId === null) {
    return response.status(400).json({ error: 'Book ID must be a positive integer.' })
  }

  const book = await database.get('SELECT * FROM book WHERE id = ?', bookId)
  if (!book) {
    return response.status(404).json({ error: 'Book not found.' })
  }

  response.json(book)
})

app.post('/books/', async (request, response) => {
  const { title, author, price, pages } = request.body
  if (!isValidBook({ title, author, price, pages })) {
    return response.status(400).json({
      error: 'Provide a non-empty title and author, a non-negative integer price, and a positive integer page count.',
    })
  }

  const result = await database.run(
    'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
    [title.trim(), author.trim(), price, pages],
  )
  const createdBook = await database.get('SELECT * FROM book WHERE id = ?', result.lastID)
  response.status(201).json(createdBook)
})

app.put('/books/:bookId/', async (request, response) => {
  const bookId = parseBookId(request.params.bookId)
  if (bookId === null) {
    return response.status(400).json({ error: 'Book ID must be a positive integer.' })
  }

  const { title, author, price, pages } = request.body
  if (!isValidBook({ title, author, price, pages })) {
    return response.status(400).json({
      error: 'Provide a non-empty title and author, a non-negative integer price, and a positive integer page count.',
    })
  }

  const result = await database.run(
    'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?',
    [title.trim(), author.trim(), price, pages, bookId],
  )
  if (result.changes === 0) {
    return response.status(404).json({ error: 'Book not found.' })
  }

  const updatedBook = await database.get('SELECT * FROM book WHERE id = ?', bookId)
  response.json(updatedBook)
})

app.delete('/books/:bookId/', async (request, response) => {
  const bookId = parseBookId(request.params.bookId)
  if (bookId === null) {
    return response.status(400).json({ error: 'Book ID must be a positive integer.' })
  }

  const result = await database.run('DELETE FROM book WHERE id = ?', bookId)
  if (result.changes === 0) {
    return response.status(404).json({ error: 'Book not found.' })
  }

  response.json({ message: 'Book deleted successfully.' })
})

app.use((error, request, response, next) => {
  console.error(error)
  if (response.headersSent) {
    return next(error)
  }
  response.status(500).json({ error: 'An unexpected server error occurred.' })
})

const startServer = async () => {
  database = await openDatabase()
  app.listen(port, '0.0.0.0', () => {
    console.log(`Books API running at http://localhost:${port}`)
  })
}

startServer().catch(error => {
  console.error('Unable to start the Books API:', error)
  process.exit(1)
})