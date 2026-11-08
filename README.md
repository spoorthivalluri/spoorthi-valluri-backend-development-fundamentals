# Backend Development Fundamentals: Lab 1

This project demonstrates a basic server using Node.js's built-in HTTP module and a second server using Express.

## Requirements

- Node.js 18.11 or newer
- npm

## Setup

Install the project dependencies:

```bash
npm install
```

## Run the Express server

```bash
npm start
```

Open `http://localhost:3000` and try `/about`, `/time`, and an unknown route such as `/missing`.

## Run the plain Node.js server

In a second terminal, run:

```bash
npm run http
```

Open `http://localhost:3001`. The two servers use different default ports so they can run at the same time.

## Project structure

```text
BDF_LR/
|-- app.js          # Express app and its routes
|-- http-server.js  # Built-in Node.js HTTP server
|-- package.json    # Project metadata, scripts, and dependencies
|-- package-lock.json
|-- .gitignore       # Files that should not be committed
`-- README.md        # Setup, run instructions, and project notes
```

In `app.js`, the `/` route sends a welcome message, `/about` returns Spoorthi Valluri's student details as JSON, `/time` returns the current time, and the final middleware sends a 404 response for any other path.

## Course labs

- [Lab 2: SQLite books CRUD API](lab-02/README.md)
- [Lab 3: REST API query parameters, validation, and debugging](lab-03/README.md)