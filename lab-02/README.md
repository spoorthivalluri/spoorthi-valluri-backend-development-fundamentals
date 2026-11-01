# Backend Development Fundamentals: Lab 2

This project builds a Node.js and Express REST API backed by SQLite. The `book` table stores an ID, title, author, price, and page count. When the database is first created, the app inserts ten sample books.

## Run locally

From the `lab-02` directory:

```bash
npm install
npm start
```

The API listens on `http://localhost:3000`. SQLite creates `books.db` automatically; that generated file is ignored by Git.

The collection is available at both `/books/` and `/fundamentals/books/`; both paths use the same CRUD routes.

## API routes

| Method | Route | Description |
|---|---|---|
| GET | `/books/` | Return all books |
| GET | `/books/:bookId/` | Return one book |
| POST | `/books/` | Add a book |
| PUT | `/books/:bookId/` | Replace a book's details |
| DELETE | `/books/:bookId/` | Delete a book |

POST and PUT expect JSON with `title`, `author`, `price`, and `pages`. Price must be a non-negative integer and pages must be a positive integer. SQL values are passed as parameters.

Example request body:

```json
{
  "title": "A New Beginning",
  "author": "Spoorthi Valluri",
  "price": 25,
  "pages": 240
}
```

## Deployment note

On Render's free instance, the local SQLite database is temporary and can reset when the service restarts or redeploys. The app creates and seeds the database on startup so the API remains usable after a reset.