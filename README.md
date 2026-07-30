# 🚀 **2026 Blog API — Backend Documentation**

A modern, production-grade backend powering the **2026 Blog App**.  
Built with **Node.js**, **Express**, **TypeScript**, **MongoDB**, and a fully tested architecture including **authentication**, **file uploads**, **PDF generation**, and **comment trees**.

This backend is designed with **real-world engineering practices**:

- strict TypeScript typing
- layered architecture
- integration-first testing
- secure authentication
- clean error handling
- scalable route design
- Puppeteer-based PDF export
- image upload & validation
- rate limiting
- environment-driven configuration

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
- 80%+ integration coverage

### **Tooling**

- ESLint + Prettier
- ts-node / ts-node-dev
- dotenv
- Husky (optional)

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

The backend follows a **clean separation of concerns**:

- **Routes** handle HTTP
- **Controllers** handle business logic
- **Models** handle persistence
- **Middleware** handles cross-cutting concerns
- **Services** handle external systems
- **Utils** handle pure logic

---

## 🔐 **Authentication**

The backend uses **JWT-based authentication** with:

- Access tokens
- Refresh tokens
- Secure cookie support (optional)
- `authenticateToken` middleware
- `req.user.userId` injected into the request

Draft posts and comment actions require authentication.  
Published posts are public.

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
- Local storage (can be swapped for S3)
- Automatic cleanup on failure

---

## 📄 **PDF Export**

One of the flagship features of this backend.

- Uses **Puppeteer** to render a frontend export page
- Generates a clean A4 PDF
- Supports draft protection
- Author-only access for drafts
- Public access for published posts
- Fully mocked in tests

---

## 🧪 **Testing Strategy**

This backend uses a **realistic, production-grade testing strategy**:

### ✔ Integration-first

All routes are tested end-to-end using:

- in-memory MongoDB
- Supertest
- mocked Puppeteer
- real authentication flow

### ✔ Unit tests

Pure logic (utils, serializers, token service) is fully unit tested.

### ✔ Coverage

- **80%+ integration coverage**
- **High coverage on critical logic**
- **PDF route: 97% coverage**
- **Auth middleware: 96% coverage**

This is the kind of test suite used in real companies.

---

## ⚙️ **Environment Variables**

Create a `.env` file:

```env
PORT=4000
MONGO_URI=mongodb:your-mongo-uri
JWT_SECRET=your-secret
REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=uploads
```

---

## ▶️ **Running the Backend**

### Install dependencies

```bash
npm install
```

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
npm test
```

---

## 🧩 **API Overview**

### Auth routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Post routes

- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`

### Comment routes

- `GET /api/posts/:id/comments/tree`
- `POST /api/comments`
- `PATCH /api/comments/:id`
- `DELETE /api/comments/:id`
- `POST /api/comments/:id/like`

### PDF

- `POST /api/pdf`
  - Public for published posts
  - Author-only for drafts

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

## 📌 **Future Improvements**

- Redis caching
- Background jobs (BullMQ)
- Webhooks for PDF export
- S3 storage
- Role-based permissions

---

## 🧑‍💻 **Author**

Backend developed by **Dominique**  
2026 Blog App — Full-stack project (React + Express + MongoDB)
