# Pastebin Lite

A lightweight, persistent pastebin application built with Node.js, Express, and SQLite.

## Features
- Create text pastes with optional expiration (TTL) and view limits.
- Retrieve pastes via API or shareable web URL.
- Automatic expiration and view counting.
- Persistent storage using SQLite.

## Prerequisites
- Node.js (v14 or higher)
- npm

## How to Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser at `http://localhost:3000`.

## Persistence Layer
The application uses **SQLite** (via `better-sqlite3`) for persistence. The database is stored in a file named `pastebin.db` in the project root. This ensures data survives application restarts and requires no manual database server setup.

## Design Decisions
- **Database**: SQLite was chosen for its zero-configuration requirement and ACID compliance. WAL mode is enabled for better concurrency.
- **IDs**: `nanoid` is used to generate unique, URL-friendly IDs.
- **View Counting**: View counts are updated atomically in the database transaction when a paste is fetched. If a paste reaches its view limit, it becomes immediately unavailable (404).
- **Time Handling**: Server-side time is used for expiration. A `TEST_MODE` is implemented to facilitate deterministic testing of expiry logic via the `x-test-now-ms` header.
- **Security**: HTML content is escaped using `escape-html` to prevent XSS attacks when viewing pastes in the browser.

## API Endpoints

### Health Check
`GET /api/healthz`
Returns 200 OK if the service is healthy.

### Create Paste
`POST /api/pastes`
Body:
```json
{
  "content": "Hello World",
  "ttl_seconds": 60,   // Optional
  "max_views": 5       // Optional
}
```

### Get Paste
`GET /api/pastes/:id`
Returns paste details or 404 if not found/expired/limit reached.

### View Paste (HTML)
`GET /p/:id`
Renders the paste content in HTML.
"# Pastebin-Lite" 
"# Pastebin-Lite" 
