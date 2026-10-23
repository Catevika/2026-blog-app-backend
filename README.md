# 🚀 **2026 Blog API - Backend Documentation**

A backend for the **2026 Blog App**, built with **Node.js**, **Express**, **TypeScript**, and **MongoDB**. It provides:

- Cookie-based JWT authentication
- Post and nested-comment APIs
- Validated image uploads to Cloudinary
- Puppeteer-based PDF export
- Unit and integration tests

---

## 📑 **Table of Contents** <!-- omit from toc -->

- [🚀 **2026 Blog API - Backend Documentation**](#-2026-blog-api---backend-documentation)
  - [📦 **Tech Stack**](#-tech-stack)
    - [**Core**](#core)
    - [**Testing**](#testing)
    - [**Tooling**](#tooling)
  - [🧱 **Architecture Overview**](#-architecture-overview)
  - [🔐 **Authentication**](#-authentication)
  - [📝 **Posts \& Comments**](#-posts--comments)
    - [Posts](#posts)
    - [Comments](#comments)
  - [🖼️ **Image Uploads**](#️-image-uploads)
  - [📄 **PDF Export**](#-pdf-export)
  - [🧪 **Testing Strategy**](#-testing-strategy)
    - [Coverage](#coverage)
  - [⚙️ **Environment Variables**](#️-environment-variables)
  - [▶️ **Running the Backend**](#️-running-the-backend)
    - [Install dependencies](#install-dependencies)
    - [Install Puppeteer's browser](#install-puppeteers-browser)
    - [Start in development](#start-in-development)
    - [Start in production](#start-in-production)
    - [Run tests](#run-tests)
  - [🧩 **API Overview**](#-api-overview)
    - [Auth routes](#auth-routes)
    - [Post routes](#post-routes)
    - [Comment routes](#comment-routes)
    - [PDF](#pdf)
    - [Upload](#upload)
  - [🧭 **Design Principles**](#-design-principles)
  - [📌 **Potential next steps**](#-potential-next-steps)
  - [🧑‍💻 **Author**](#-author)

---

## 📦 **Tech Stack**

### **Core**

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT authentication
- Multer for file uploads
- Puppeteer for PDF generation

### **Testing**

- Vitest
- Supertest
- In-memory MongoDB
- Full integration test suite
- Coverage reports for unit and integration suites

### **Tooling**

- ESLint + Prettier
- tsx
- dotenv

---

## 🧱 **Architecture Overview**

```txt
src/
 ├── config/          # Environment, DB, auth config, shared constants
 ├── controllers/     # Auth logic (login, register, refresh)
 ├── errors/          # Custom error classes
 ├── middleware/      # Auth, rate-limit, upload, validation
 ├── models/          # Mongoose schemas (User, Post, Comment…)
 ├── routes/          # Express routes (auth, posts, comments, pdf…)
 ├── services/        # Browser/Puppeteer, token service
 ├── types/           # Shared types
 ├── utils/           # Serialization, validation, helpers
 ├── server.ts        # App bootstrap
```

The backend separates shared concerns into route handlers, auth controllers, models, middleware, services, and utilities:

- **Routes** handle HTTP and coordinate request logic
- **Controllers** contain authentication business logic
- **Models** handle persistence
- **Middleware** handles cross-cutting concerns
- **Services** handle external systems
- **Utils** handle pure logic

---

## 🔐 **Authentication**

The backend uses **JWT-based authentication** with:

- Access tokens
- Refresh tokens
- HTTP-only access and refresh cookies
- `authenticateToken` middleware
- `req.user.userId` injected into the request

Post mutations and comment mutations require authentication. PDF exports are
public for published posts and restricted to the author for drafts.

---

## 📝 **Posts & Comments**

### Posts

- Create, update, delete
- Draft vs published
- Slug generation
- Pagination
- Like/unlike
- Soft delete

### Comments

- Nested comment tree
- Like/unlike
- Edit/delete
- Serialization for frontend

---

## 🖼️ **Image Uploads**

- Multer-based upload
- Image validation (size, type)
- Cloudinary storage
- JPG, PNG, and WebP validation, with a 5 MB file-size limit

---

## 📄 **PDF Export**

- Uses **Puppeteer** to render a frontend export page
- Generates a clean A4 PDF
- Supports draft protection
- Author-only access for drafts
- Public access for published posts
- Fully mocked in tests

---

## 🧪 **Testing Strategy**

Integration tests exercise API routes using:

- in-memory MongoDB
- Supertest
- mocked Puppeteer
- real authentication flow

Unit tests cover utility and service logic.

### Coverage

Generate the unit and integration coverage reports separately with the commands in [Running the Backend](#️-running-the-backend). Coverage percentages depend on the current test run; Playwright frontend tests are maintained in the frontend project and are not part of these reports.

---

## ⚙️ **Environment Variables**

Create a `.env` file:

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/2026-blog-app
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

`PORT` defaults to `3000`; use `4000` for the frontend's default local Vite proxy. MongoDB and the Cloudinary values are needed for their respective features. Do not commit real credentials.

For local development, `npm run dev` loads `.env.dev` when it exists, before
falling back to values in `.env`. Set `FRONTEND_URL=http://localhost:5173` there
so Puppeteer renders the local Vite export page instead of the deployed frontend.

---

## ▶️ **Running the Backend**

### Install dependencies

```bash
npm install
```

### Install Puppeteer's browser

PDF export requires the Chrome version bundled for the installed Puppeteer release:

```bash
npx puppeteer browsers install chrome
```

Run this once after installing or updating backend dependencies if the browser
is not already installed.

### Start in development

```bash
npm run dev
```

### Start in production

```bash
npm run build
npm start
```

### Run tests

```bash
npm run test:all
npm run test:unit
npm run test:integration
npm run test:coverage:unit
npm run test:coverage:integration
```

---

## 🧩 **API Overview**

### Auth routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/verify`
- `GET /api/auth/me` (authenticated)

### Post routes

- `GET /api/posts`
- `GET /api/posts/feed`
- `GET /api/posts/favorites`
- `GET /api/posts/check-slug?slug=:slug`
- `GET /api/posts/:id`
- `POST /api/posts/new` (authenticated)
- `PUT /api/posts/:id` (authenticated; includes soft delete)
- `GET /api/posts/trash/list` (authenticated)
- `POST /api/posts/:id/restore` (authenticated)
- `POST /api/posts/:id/like` (authenticated)

### Comment routes

- `GET /api/posts/:postId/comments`
- `GET /api/posts/:postId/comments/tree`
- `POST /api/posts/:postId/comments` (authenticated)
- `POST /api/posts/:postId/comments/:id/like` (authenticated)
- `PUT /api/posts/:postId/comments/:id` (authenticated)
- `DELETE /api/posts/:postId/comments/:id` (authenticated)

### PDF

- `POST /api/pdf`
  - Published posts can be exported publicly
  - Draft exports require the author's authentication

### Upload

- `POST /api/upload/image`

---

## 🧭 **Design Principles**

This backend follows modern engineering principles:

- **Strict typing**
- **Predictable error handling**
- **Pure functions where possible**
- **Integration-first testing**
- **Separation of concerns**
- **Security by default**
- **Scalable architecture**

---

## 📌 **Potential next steps**

- [ ] Redis caching
- [ ] Background jobs (BullMQ)
- [ ] Webhooks for PDF export
- [ ] S3 storage
- [ ] Role-based permissions

---

## 🧑‍💻 **Author**

Backend developed by **Catevika**  
2026 Blog App — Full-stack project (React + Express + MongoDB)
