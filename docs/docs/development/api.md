---
sidebar_position: 2
---

# API Reference

Lektr exposes a REST API at `/api/v1/`.

## Authentication

All API endpoints (except auth routes) require authentication via HTTP-only cookie.

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**: Sets `auth_token` cookie and returns user object.

### Logout

```http
POST /api/v1/auth/logout
```

### Current User

```http
GET /api/v1/auth/me
```

---

## Books

### List Books

```http
GET /api/v1/books
```

**Response**:
```json
{
  "books": [
    {
      "id": "uuid",
      "title": "Atomic Habits",
      "author": "James Clear",
      "coverImageUrl": "/api/v1/covers/...",
      "highlightCount": 42
    }
  ]
}
```

### Get Book

```http
GET /api/v1/books/:id
```

### Update Book

```http
PATCH /api/v1/books/:id
Content-Type: application/json

{
  "title": "New Title",
  "author": "New Author"
}
```

### Delete Book

```http
DELETE /api/v1/books/:id
```

---

## Highlights

### Get Highlights for Book

```http
GET /api/v1/books/:bookId/highlights
```

### Create Highlight

```http
POST /api/v1/books/:bookId/highlights
Content-Type: application/json

{
  "content": "Highlight text",
  "note": "Optional note",
  "chapter": "Chapter 1",
  "page": 42
}
```

### Update Highlight

```http
PATCH /api/v1/highlights/:id
Content-Type: application/json

{
  "content": "Updated text",
  "note": "Updated note"
}
```

### Delete Highlight

```http
DELETE /api/v1/highlights/:id
```

---

## Search

### Hybrid Search

```http
GET /api/v1/search?q=query&limit=20
```

**Response**:
```json
{
  "results": [
    {
      "id": "highlight-uuid",
      "content": "Matching highlight...",
      "bookTitle": "Book Name",
      "bookAuthor": "Author",
      "score": 0.85
    }
  ]
}
```

---

## Tags

### List Tags

```http
GET /api/v1/tags
```

### Create Tag

```http
POST /api/v1/tags
Content-Type: application/json

{
  "name": "philosophy",
  "color": "#8B5CF6"
}
```

### Add Tag to Book

```http
POST /api/v1/tags/:tagId/books/:bookId
```

### Add Tag to Highlight

```http
POST /api/v1/tags/:tagId/highlights/:highlightId
```

---

## Review (FSRS)

### Get Due Cards

```http
GET /api/v1/review/due
```

### Submit Review

```http
POST /api/v1/review/:highlightId
Content-Type: application/json

{
  "rating": 3  // 1=Again, 2=Hard, 3=Good, 4=Easy
}
```

---

## Import

### Upload File

```http
POST /api/v1/import
Content-Type: multipart/form-data

source: "kindle" | "koreader"
file: <file>
```

### Manual Entry

```http
POST /api/v1/import/manual
Content-Type: application/json

{
  "title": "Book Title",
  "author": "Author Name",
  "content": "Highlight text",
  "note": "Optional note"
}
```

---

## Admin

### Get Email Settings

```http
GET /api/v1/admin/email-settings
```

### Update Email Settings

```http
PUT /api/v1/admin/email-settings
Content-Type: application/json

{
  "smtp_host": "smtp.gmail.com",
  "smtp_port": "587",
  "smtp_user": "user@gmail.com",
  "smtp_pass": "app-password",
  "mail_from_name": "Lektr",
  "mail_from_email": "noreply@example.com"
}
```

### Test Email

```http
POST /api/v1/admin/email-settings/test
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### Job Queue Status

```http
GET /api/v1/admin/job-queue/status
```

**Response**:
```json
{
  "pending": 5,
  "processing": 1,
  "failed": 0,
  "completed": 150
}
```
