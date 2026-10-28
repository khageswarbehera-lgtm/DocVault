# DocVault Frontend

The React application is integrated with the DocVault API. It uses authenticated API requests for sign-in and registration, document and folder operations, sharing, avatar updates, and storage statistics. Configure and run the backend separately; the frontend does not contain database or object-storage credentials.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A running DocVault backend for API-backed flows

## Setup and local development

From this directory:

```bash
npm ci
```

The API base URL defaults to `http://localhost:5000/api`. To set it explicitly, copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend API base URL, including `/api`. Then start the frontend:

```bash
npm run dev
```

Run the backend in a separate terminal. See [backend setup](../backend/README.md#setup) and [backend environment variables](../backend/README.md#environment-variables). Authenticated screens require the backend and its configured services. The dev frontend origin `http://localhost:5173` is allowed by the backend outside production.

## Commands

```bash
npm run lint
npm run build
npm run preview
```

There is no frontend test script at present. The production build output is written to `dist/`.

## Configuration and deployment

Set `VITE_API_BASE_URL` in the frontend build environment to the deployed backend's public API base URL, including `/api` (for example, `https://api.example.com/api`). Build with `npm run build` and serve the generated `dist/` directory using the chosen static hosting provider.

`VITE_` variables are embedded in public frontend assets. Never put storage credentials, database credentials, JWT secrets, or any other private values in frontend variables. Set `CLIENT_URL` in the backend environment to the exact deployed frontend origin so the API allows the frontend through CORS. See [backend deployment configuration](../backend/README.md#environment-variables).

### Render static site

The root [`render.yaml`](../render.yaml) includes a Render static site with `frontend` as its root directory. It installs with `npm ci`, builds with `npm run build`, and publishes `dist/`. A rewrite sends client-side routes to `/index.html`, as required by the app's `BrowserRouter`. Automatic deploys are disabled.

When configuring the site, set `VITE_API_BASE_URL` to the backend's public URL ending in `/api` (for example, `https://docvault-api.example.com/api`; use the actual URL Render assigns). This is a public API address, not a secret. After the frontend URL is assigned, set the backend's `CLIENT_URL` to that exact origin, without a path. See [backend deployment configuration](../backend/README.md#production-deployment-prerequisites).
