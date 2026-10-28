# DocVault Backend

The DocVault Express API provides JWT authentication, private Cloudflare R2 uploads and downloads, owner-scoped document and folder operations, sharing, avatar uploads, and storage accounting.

## Requirements

- Node.js 20.19+ or 22.12+
- A MongoDB Atlas cluster and database user

## Setup

```bash
npm ci
```

For local development, create `backend/.env` from `.env.example` and fill in the required values:

```powershell
Copy-Item .env.example .env
```

Set up the MongoDB and Cloudflare R2 resources described below before starting the API.

## Environment variables

Configure these values in the backend process environment for production (or in `backend/.env` for local development). The backend example file contains development-safe placeholders, not production credentials.

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Set to `production` for a deployed backend | Enables production logging and error handling and disables development-only behavior. |
| `PORT` | Optional; defaults to `5000` | Port on which the API listens. Set this to the port assigned by the hosting platform. |
| `MONGODB_URI` | Required | MongoDB Atlas connection string used by the backend to store accounts and document metadata. Keep it backend-only. |
| `JWT_SECRET` | Required; at least 32 characters | Private key used to sign and verify authentication tokens. Generate a unique, unpredictable value and keep it backend-only. |
| `JWT_EXPIRES_IN` | Optional; defaults to `7d` | Token lifetime in a format accepted by `jsonwebtoken` (for example, `7d`). |
| `R2_ACCOUNT_ID` | Required | Cloudflare account identifier used to validate the R2 endpoint. |
| `R2_ACCESS_KEY_ID` | Required | Private R2 API access key identifier. Backend-only. |
| `R2_SECRET_ACCESS_KEY` | Required | Private R2 API secret key. Backend-only. |
| `R2_BUCKET_NAME` | Required | Name of the private R2 bucket used for document objects. |
| `R2_ENDPOINT` | Required | HTTPS account endpoint in the form `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`; do not include a bucket name or path. |
| `CLIENT_URL` | Required in production | Exact frontend origin or comma-separated exact origins allowed by CORS (for example, `https://app.example.com,https://admin.example.com`). Production does not implicitly allow localhost. |
| `MAX_FILE_SIZE_MB` | Optional; defaults to `25` | Maximum accepted upload size in whole megabytes; supported values are `1` through `1024`. |
| `DNS_SERVERS` | Optional | Comma-separated DNS resolver IP addresses for this backend process. Leave unset or blank to use the system default; use only when custom DNS resolution is needed. |

All database, token-signing, and R2 credentials belong only in the backend environment. Never place them in frontend variables or source code. For local setup, see [`.env.example`](./.env.example). If Node.js reports `querySrv ECONNREFUSED` while Windows DNS can resolve Atlas, `DNS_SERVERS=1.1.1.1` is one possible backend-only override.

Run the development server from this directory:

```bash
npm run dev
```

The API waits for MongoDB to connect before listening. The server requires `JWT_SECRET`, `MONGODB_URI`, and all five `R2_*` values at startup. `CLIENT_URL` is mandatory in production. A missing or invalid required value prevents startup.

## Tests

Run the backend Jest suite from this directory:

```bash
npm test -- --runInBand
```

The current tests use `mongodb-memory-server` for database-backed test setup. They do not require production credentials or connect to production services.

## Production deployment prerequisites

The repository includes a Render Blueprint in [`render.yaml`](../render.yaml) for a Node web service. It uses Node.js 22.12, `npm ci`, `npm start`, and `/api/health`; automatic deploys are disabled in the Blueprint. Review the Blueprint and complete its unsynced environment variables in Render before creating or starting the service. This file prepares configuration only and does not deploy the application.

The service needs a reachable MongoDB Atlas database and private R2 bucket. Set `NODE_ENV=production`, `CLIENT_URL` to the deployed frontend origin or exact comma-separated origins, and all required secrets/settings in the backend service environment. Render supplies `PORT`; the server listens on that value, with `5000` as the local fallback. Optional values are documented in the environment table. Configure frontend `VITE_API_BASE_URL` separately to the public API URL ending in `/api`. Never expose backend credentials in frontend configuration.

The `/api/health` check returns `200` only when both MongoDB and R2 are available, otherwise `503`. The server handles `SIGTERM` and `SIGINT` by stopping the HTTP listener and closing database and R2 clients.

## Available endpoints

| Method | Endpoint      | Result                                                      |
| ------ | ------------- | ----------------------------------------------------------- |
| GET    | `/api/health` | API and dependency health status |

Check it at `http://localhost:5000/api/health` after the server starts.

| Method | Endpoint                         | Request                                                           |
| ------ | -------------------------------- | ----------------------------------------------------------------- |
| POST   | `/api/auth/register`             | JSON body: `name`, `email`, `password`; returns safe user and JWT |
| POST   | `/api/auth/login`                | JSON body: `email`, `password`; returns safe user and JWT         |
| GET    | `/api/auth/me`                   | Requires `Authorization: Bearer <token>`                          |
| POST   | `/api/auth/logout`               | Requires bearer token; client removes its token                   |
| GET    | `/api/documents?page=1&limit=20` | List the authenticated user's active documents, paginated         |
| GET    | `/api/documents/:id`             | Return an owned active document; requires bearer token            |
| PUT    | `/api/documents/:id`             | Rename an owned active document; JSON body: `name`                |
| DELETE | `/api/documents/:id`             | Soft-delete an owned active document                              |

Register and login return `{ success, message, data: { user, token } }`. Passwords are hashed with bcryptjs and excluded from normal user queries and API responses. JWTs are stateless; logout does not revoke a token server-side, so the client must discard it. Expired tokens are rejected.

Generate a JWT secret locally with Node.js using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, then put the output in `backend/.env`.

All document routes require a valid bearer token and scope database queries to its authenticated user ID. Requests for another user's document return the same `404` as an unknown document ID. Storage keys and R2 credentials are never returned by the API. Soft delete only marks the MongoDB record as deleted; it does not remove the private R2 object.

## Upload and download

Upload endpoint: `POST /api/documents/upload`. Send `multipart/form-data` with one file in the `file` field and `Authorization: Bearer <token>`. Supported formats are PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG/JPEG, and PNG. The API checks the extension, MIME type, and content signature where supported. The maximum size defaults to 25 MB and is configurable with `MAX_FILE_SIZE_MB` as an integer from 1 to 1024 (memory usage increases with the limit).

The API uploads the actual bytes to R2 first, then creates the MongoDB metadata record using the authenticated user's ID. If metadata creation fails, the API attempts to remove the new R2 object. The response includes metadata only, never the storage key. Download endpoint: `GET /api/documents/:id/download`; it verifies ownership and returns a private signed URL valid for 300 seconds.

### Test with Thunder Client or Postman

1. Start the backend with a reachable Atlas database and the R2 settings configured.
2. Register or log in with `POST /api/auth/register` or `POST /api/auth/login`, then copy `data.token` from the response.
3. Create a `POST` request to `http://localhost:5000/api/documents/upload` and add `Authorization: Bearer <token>`.
4. Choose **Body → form-data**, add a field named `file`, switch its type to **File**, and choose a supported document. Let the client generate the multipart `Content-Type` boundary; do not set that header manually.
5. Send the request. Success returns `201 Created`, for example:

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "665f1f77bcf86cd799439011",
    "name": "sample.pdf",
    "originalName": "sample.pdf",
    "mimeType": "application/pdf",
    "extension": "pdf",
    "size": 245678,
    "folderId": null,
    "isFavorite": false,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-09-28T12:00:00.000Z",
    "updatedAt": "2026-09-28T12:00:00.000Z"
  }
}
```

Use `data.id` with `GET /api/documents/:id/download` and the same bearer token to get a temporary download URL.

## Folders and document organization

All routes below require `Authorization: Bearer <token>` and use the authenticated user's ID for database access.

| Method | Endpoint                                         | Purpose                                                                         |
| ------ | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| POST   | `/api/folders`                                   | Create a folder with `{ "name": "Receipts", "parentFolder": null }`             |
| GET    | `/api/folders?page=1&limit=20`                   | List the user's folders with pagination                                         |
| GET    | `/api/folders/:id`                               | Read an owned folder                                                            |
| PUT    | `/api/folders/:id`                               | Rename or change `parentFolder`; use `null` for root                            |
| DELETE | `/api/folders/:id`                               | Delete an empty folder; non-empty folders return `409`                          |
| PATCH  | `/api/documents/:id/move`                        | Move an owned active document with `{ "folderId": "..." }`; use `null` for root |
| GET    | `/api/documents/trash?page=1&limit=20`           | List soft-deleted documents                                                     |
| PATCH  | `/api/documents/:id/restore`                     | Restore an owned trashed document                                               |
| DELETE | `/api/documents/:id/permanent`                   | Permanently remove an owned trashed document from R2 and MongoDB                |
| PATCH  | `/api/documents/:id/favorite`                    | Toggle favorite state for an owned active document                              |
| GET    | `/api/documents/favorites?page=1&limit=20`       | List the user's active favorites                                                |
| GET    | `/api/documents/recent?page=1&limit=10`          | List active documents ordered by most recently updated                          |
| GET    | `/api/documents/search?q=report&page=1&limit=20` | Search active documents by name, original name, or MIME type                    |

Folder parent changes reject cross-user folders and cycles. A folder cannot be deleted while it contains child folders or documents, including trashed documents. Soft-deleting a document does not delete its R2 object, and its bytes keep counting against the owner's storage allowance; only a permanent delete releases them.

## Account and storage endpoints

All routes below require `Authorization: Bearer <token>`.

| Method | Endpoint            | Purpose                                                              |
| ------ | ------------------- | -------------------------------------------------------------------- |
| GET    | `/api/user/avatar`  | Read the authenticated user's avatar metadata                        |
| POST   | `/api/user/avatar`  | Replace the avatar; `multipart/form-data` field `avatar` (1 MB JPG/PNG limit) |
| GET    | `/api/user/storage` | Live usage totals plus a per-file-type breakdown                     |

`GET /api/user/storage` aggregates every document the user owns, active and trashed, and returns:

```json
{
  "success": true,
  "message": "Storage usage retrieved",
  "data": {
    "storageUsed": 104857600,
    "storageLimit": 5368709120,
    "percentageUsed": 2,
    "totalDocuments": 24,
    "activeDocuments": 22,
    "activeBytes": 94371840,
    "trashedDocuments": 2,
    "trashedBytes": 10485760,
    "favoriteDocuments": 3,
    "fileTypes": [{ "extension": "pdf", "count": 9, "bytes": 52428800, "percentage": 55.6 }]
  }
}
```

### How usage is kept correct

`users.storageUsed` is a cached running total maintained by `src/services/storageService.js`:

- `trackStorageChange(userId, delta)` adjusts it after a successful upload (`+size`) and after a permanent delete (`-size`). It never throws: `adjustStorageUsed` clamps the stored value at zero, so a stray or repeated decrement cannot make usage negative, and a lost update only needs the next read to repair it.
- `getStorageSummary(userId)` recomputes usage from the documents collection on every read and rewrites `users.storageUsed` whenever the cached value has drifted. A missed counter is therefore corrected the next time the user opens Storage, the dashboard, or the sidebar.
- `assertStorageQuota(userId, incomingSize)` runs at the start of `POST /api/documents/upload`, before any byte is sent to R2. The cached value is the fast path; when it suggests the upload would not fit, the authoritative aggregate is re-read and the counter repaired, so stale bookkeeping can neither block a valid upload nor let an oversized one through. A rejected upload returns `413` with `code: "STORAGE_QUOTA_EXCEEDED"` and a message naming the used, free, and total bytes.

Trash counts toward the allowance because the R2 object still exists until the document is permanently deleted. `fileTypes`, by contrast, only covers active documents, so the chart describes what the user can still see rather than everything on disk. `storageLimit` is a per-user field on the `User` model with a 5 GB default; change the schema default (or the field on a specific user) to sell different plans.

## MongoDB Atlas

Create an Atlas cluster and database user, allow the development machine's IP in Network Access, then copy the Node.js connection string into `MONGODB_URI`. The application opens one Mongoose connection on startup and does not connect per request.

## Middleware and current limitations

Helmet security headers, environment-specific CORS allowlisting, Morgan request logging, JSON parsing with a 1 MB limit, a 100-request per 15-minute rate limit, and centralized error responses are configured. Requests with unapproved origins receive `403 Forbidden`. Notification delivery and configurable per-plan quotas are not implemented; storage allowance is currently a per-user model value with a 5 GB default.
