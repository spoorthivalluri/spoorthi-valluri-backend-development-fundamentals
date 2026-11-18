const express = require('express')
const path = require('node:path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

const JWT_SECRET = 'lab-4-development-secret'
const BCRYPT_ROUNDS = 10

const openDatabase = async (databasePath = path.join(__dirname, 'users.db')) => {
  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  })

  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `)

  return database
}

const validateCredentials = body => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.'
  }

  const { username, name, password } = body
  if (typeof username !== 'string' || username.trim() === '') {
    return 'A non-empty username is required.'
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return 'Name must be a non-empty string.'
  }
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.'
  }

  return null
}

const createApp = database => {
  const app = express()
  app.use(express.json())

  app.get('/', (request, response) => {
    response.json({
      message: 'Authentication API is running.',
      student: 'Samala Ashwitha',
      registrationNumber: '252U1R1223',
    })
  })

  app.get(['/register', '/register/'], (request, response) => {
    response.status(200).json({
      message: 'Registration endpoint is ready.',
      method: 'POST',
      path: '/register',
      body: {
        username: 'string',
        name: 'string',
        password: 'string',
      },
    })
  })

  app.post('/register', async (request, response) => {
    const validationMessage = validateCredentials(request.body)
    if (validationMessage) {
      return response.status(400).json({ message: validationMessage })
    }

    const username = request.body.username.trim()
    const name =
      typeof request.body.name === 'string' && request.body.name.trim()
        ? request.body.name.trim()
        : 'Samala Ashwitha'
    const password = request.body.password

    const existingUser = await database.get(
      'SELECT id FROM users WHERE username = ?',
      username,
    )
    if (existingUser) {
      return response.status(400).json({ message: 'Username already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await database.run(
      'INSERT INTO users (username, name, password) VALUES (?, ?, ?)',
      [username, name, passwordHash],
    )

    response.status(201).json({
      message: 'User registered successfully.',
      username,
      name,
    })
  })

  app.post('/login', async (request, response) => {
    const validationMessage = validateCredentials(request.body)
    if (validationMessage) {
      return response.status(400).json({ message: validationMessage })
    }

    const username = request.body.username.trim()
    const user = await database.get(
      'SELECT username, password FROM users WHERE username = ?',
      username,
    )
    if (!user) {
      return response.status(400).json({ message: 'Invalid username or password.' })
    }

    const passwordMatches = await bcrypt.compare(request.body.password, user.password)
    if (!passwordMatches) {
      return response.status(400).json({ message: 'Invalid username or password.' })
    }

    const jwtToken = jwt.sign({ username: user.username }, JWT_SECRET)
    response.status(200).json({ jwt_token: jwtToken })
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

    console.error('Authentication API request failed:', error)
    response.status(500).json({ message: 'An unexpected server error occurred.' })
  })

  return app
}

const startServer = async () => {
  const database = await openDatabase()
  const app = createApp(database)
  const port = process.env.PORT || 3000
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Authentication API running at http://localhost:${port}`)
  })

  server.once('error', async error => {
    console.error('Unable to start the Authentication API:', error)
    await database.close()
    process.exitCode = 1
  })
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Unable to initialize the Authentication API:', error)
    process.exitCode = 1
  })
}

module.exports = { createApp, openDatabase, JWT_SECRET }
