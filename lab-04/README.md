# Lab 4: Registration, login and JWT

**Name:** Spoorthi Valluri

**Registration number:** Not provided

**Class & Section:** 211 & CSE - 2E

**Subject:** Backend Development Fundamentals

**Live link:** https://spoorthi-valluri-lab04-auth-api.onrender.com

**GitHub repository:** https://github.com/spoorthivalluri/spoorthi-valluri-backend-development-fundamentals/tree/main/lab-04

## Project description

This API provides user registration and login using Express and SQLite. Passwords are stored only as bcrypt hashes. A successful login creates a signed JSON Web Token containing only the username.

## Install and run

From the repository root:

```powershell
cd lab-04
npm install
npm start
```

The API runs at `http://localhost:3000`. Set a different port with PowerShell if needed:

```powershell
$env:PORT=3001
npm start
```

Required environment variables:

```text
PORT=server port for local or hosted use
```

The JWT secret is kept in `app.js` for this lab as required. Do not commit a real secret or `.env` file.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check and student information. |
| POST | `/register` | Register a user with a hashed password; reject duplicate usernames with `400`. |
| POST | `/login` | Verify credentials and return `{ "jwt_token": "..." }` on success. |

### Registration example

```json
{
  "username": "spoorthi",
  "name": "Spoorthi Valluri",
  "password": "secret123"
}
```

### Login example

```json
{
  "username": "spoorthi",
  "password": "secret123"
}
```

Unknown users and wrong passwords return `400`.

## Test

Run the integration tests:

```powershell
npm test
```

The tests verify duplicate registration, bcrypt password storage, successful login, unknown users, wrong passwords, and that the JWT payload excludes the password.

## Deploy

The repository includes the Render Blueprint in `render.yaml`. Create the BluePrint service, use `lab-04` as the root directory, install dependencies, and set `PORT` automatically by Render. The deployed URL should be placed in the Live link above.

## Screenshots

Postman screenshots should be placed in `screenshots/` and linked here:

- Successful registration
- Duplicate username failure
- Successful login and JWT
- Unknown user failure
- Wrong-password failure
- Database view showing bcrypt password hashes

Example image syntax:

```markdown
![Successful registration](screenshots/register-success.png)
```

## Notes

- SQL user values are passed through parameterized queries.
- Passwords are never stored or returned in plain text.
- The JWT payload contains only `username`.
- The SQLite database is generated at runtime and is excluded from Git.
