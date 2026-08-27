# CodeVault Full-Stack

A personal code storage website with real user accounts.

## Stack

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing

## Features

- Create an account
- Login / logout
- Password hashing
- JWT-based sessions
- Each user sees only their own codes
- Add, edit, delete and copy code
- Search and language filtering
- MongoDB persistence
- Dark mode

## Setup

1. Install Node.js.
2. Create a MongoDB Atlas cluster.
3. Create a database user and copy the MongoDB connection string.
4. Rename `.env.example` to `.env`.
5. Put your MongoDB URI and a long JWT secret in `.env`.
6. Open a terminal in this project folder.
7. Run:

   npm install
   npm start

8. Open:

   http://localhost:5000

Important:
- Never upload your `.env` file to GitHub.
- Never share your MongoDB password or JWT secret.
- This is a portfolio/learning implementation. For a production deployment, add stronger security controls such as rate limiting, secure cookie-based sessions, email verification, password reset, validation, HTTPS and secret management.
