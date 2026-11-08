const express = require('express')

const app = express()
const port = process.env.PORT || 3000

app.get('/', (request, response) => {
  response.send('Welcome to my Backend Development Fundamentals lab server.')
})

app.get('/about', (request, response) => {
  response.json({
    name: 'Spoorthi Valluri',
    section: '211 & CSE - 2E',
    subject: 'Backend Development Fundamentals',
  })
})

app.get('/time', (request, response) => {
  response.json({
    currentTime: new Date().toISOString(),
  })
})

app.use((request, response) => {
  response.status(404).send('Page Not Found')
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running at http://localhost:${port}`)
})