const express = require('express')
const path = require('node:path')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

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

const sortableColumns = new Set(['id', 'title', 'author', 'price', 'pages'])

const openDatabase = async (databasePath = path.join(__dirname, 'books.db')) => {
  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  })

  await database.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
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

const parseOptionalPrice = (value, name) => {
  if (value === undefined) {
    return { value: undefined }
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return { error: `${name} must be a non-negative number.` }
  }

  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) {
    return { error: `${name} must be a non-negative number.` }
  }

  return { value: price }
}

const parseBookId = value => {
  const bookId = Number(value)
  return Number.isSafeInteger(bookId) && bookId > 0 ? bookId : null
}

const validateBook = body => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.'
  }

  const { title, author, price, pages } = body
  if (typeof title !== 'string' || title.trim() === '') {
    return 'A non-empty title is required.'
  }
  if (typeof author !== 'string' || author.trim() === '') {
    return 'A non-empty author is required.'
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return 'Price must be a non-negative number.'
  }
  if (!Number.isSafeInteger(pages) || pages <= 0) {
    return 'Pages must be a positive integer.'
  }

  return null
}

const createApp = database => {
  const app = express()
  app.use(express.json())

  app.get('/', (request, response) => {
    response.json({ message: 'Books API is running. Use GET /books to browse books.' })
  })

  app.get('/books', async (request, response) => {
    const {
      search_q: searchQuery = '',
      order_by: orderBy = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price: minPrice,
      max_price: maxPrice,
    } = request.query

    if (typeof searchQuery !== 'string') {
      return response.status(400).json({ message: 'search_q must be a single text value.' })
    }
    if (typeof orderBy !== 'string' || !sortableColumns.has(orderBy)) {
      return response.status(400).json({
        message: 'order_by must be one of id, title, author, price, or pages.',
      })
    }
    if (typeof order !== 'string' || !['ASC', 'DESC'].includes(order.toUpperCase())) {
      return response.status(400).json({ message: 'order must be ASC or DESC.' })
    }

    const limitValue = Number(limit)
    const offsetValue = Number(offset)
    if (
      typeof limit !== 'string' ||
      typeof offset !== 'string' ||
      !Number.isSafeInteger(limitValue) ||
      limitValue <= 0 ||
      !Number.isSafeInteger(offsetValue) ||
      offsetValue < 0
    ) {
      return response.status(400).json({
        message: 'limit must be a positive integer and offset must be a non-negative integer.',
      })
    }

    const minPriceResult = parseOptionalPrice(minPrice, 'min_price')
    if (minPriceResult.error) {
      return response.status(400).json({ message: minPriceResult.error })
    }
    const maxPriceResult = parseOptionalPrice(maxPrice, 'max_price')
    if (maxPriceResult.error) {
      return response.status(400).json({ message: maxPriceResult.error })
    }
    if (
      minPriceResult.value !== undefined &&
      maxPriceResult.value !== undefined &&
      minPriceResult.value > maxPriceResult.value
    ) {
      return response.status(400).json({
        message: 'min_price cannot be greater than max_price.',
      })
    }

    let query = 'SELECT * FROM book WHERE title LIKE ?'
    const parameters = [`%${searchQuery}%`]

    if (minPriceResult.value !== undefined) {
      query += ' AND price >= ?'
      parameters.push(minPriceResult.value)
    }
    if (maxPriceResult.value !== undefined) {
      query += ' AND price <= ?'
      parameters.push(maxPriceResult.value)
    }

    query += ` ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`
    parameters.push(limitValue, offsetValue)

    const books = await database.all(query, parameters)
    response.json(books)
  })

  app.get('/books/:bookId', async (request, response) => {
    const bookId = parseBookId(request.params.bookId)
    if (bookId === null) {
      return response.status(400).json({ message: 'Book ID must be a positive integer.' })
    }

    const book = await database.get('SELECT * FROM book WHERE id = ?', bookId)
    if (!book) {
      return response.status(404).json({ message: 'Book not found.' })
    }

    response.json(book)
  })

  app.post('/books', async (request, response) => {
    const validationMessage = validateBook(request.body)
    if (validationMessage) {
      return response.status(400).json({ message: validationMessage })
    }

    const { title, author, price, pages } = request.body
    const result = await database.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)',
      [title.trim(), author.trim(), price, pages],
    )
    const book = await database.get('SELECT * FROM book WHERE id = ?', result.lastID)

    response.status(201).json({ message: 'Book created successfully.', book })
  })

  app.put('/books/:bookId', async (request, response) => {
    const bookId = parseBookId(request.params.bookId)
    if (bookId === null) {
      return response.status(400).json({ message: 'Book ID must be a positive integer.' })
    }

    const validationMessage = validateBook(request.body)
    if (validationMessage) {
      return response.status(400).json({ message: validationMessage })
    }

    const { title, author, price, pages } = request.body
    const result = await database.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?',
      [title.trim(), author.trim(), price, pages, bookId],
    )
    if (result.changes === 0) {
      return response.status(404).json({ message: 'Book not found.' })
    }

    const book = await database.get('SELECT * FROM book WHERE id = ?', bookId)
    response.status(200).json({ message: 'Book updated successfully.', book })
  })

  app.delete('/books/:bookId', async (request, response) => {
    const bookId = parseBookId(request.params.bookId)
    if (bookId === null) {
      return response.status(400).json({ message: 'Book ID must be a positive integer.' })
    }

    const result = await database.run('DELETE FROM book WHERE id = ?', bookId)
    if (result.changes === 0) {
      return response.status(404).json({ message: 'Book not found.' })
    }

    response.status(200).json({ message: 'Book deleted successfully.' })
  })

  app.use((request, response) => {
    response.status(404).json({ message: 'Route not found.' })
  })

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      return next(error)
    }
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ message: 'Request body must contain valid JSON.' })
    }

    console.error('Books API request failed:', error)
    response.status(500).json({ message: 'An unexpected server error occurred.' })
  })

  return app
}

const startServer = async () => {
  const database = await openDatabase()
  const app = createApp(database)
  const port = process.env.PORT || 3000
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Books API running at http://localhost:${port}`)
  })

  server.once('error', async error => {
    console.error('Unable to start the Books API:', error)
    try {
      await database.close()
    } catch (closeError) {
      console.error('Unable to close the Books API database:', closeError)
    }
    process.exitCode = 1
  })
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Unable to initialize the Books API:', error)
    process.exitCode = 1
  })
}

module.exports = { createApp, openDatabase }
