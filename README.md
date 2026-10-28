# DocVault

DocVault contains a React frontend in `frontend/` and an Express API in `backend/`. The frontend is integrated with the API for authentication and document, folder, sharing, avatar, and storage operations. MongoDB Atlas stores account and document metadata; Cloudflare R2 stores private file objects.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas and a database user
- Cloudflare R2 bucket and API credentials

Each application has its own `package.json` and `package-lock.json`; install dependencies from each project directory using `npm ci`.

## Local development

In PowerShell, prepare the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Set the required backend values in `backend/.env` as described in [backend configuration](backend/README.md#environment-variables). Do not use production credentials for local development.

Prepare the frontend environment file if you want to configure the API URL explicitly:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

The default frontend API URL is `http://localhost:5000/api`. Start each app in its own terminal:

```powershell
cd backend
npm ci
npm run dev
```

```powershell
cd frontend
npm ci
npm run dev
```

The backend connects to MongoDB before it listens and requires the database and R2 configuration described in its README. The frontend dev server and API run separately. Local CORS allows `http://localhost:5173` outside production.

## Checks

Run the backend tests, frontend lint, and production build with:

```powershell
cd backend
npm ci
npm test -- --runInBand
```

```powershell
cd frontend
npm ci
npm run lint
npm run build
```

GitHub Actions runs these same checks on pushes and pull requests. The frontend does not currently define a test script.

## Deployment prerequisites

Deploy the backend and frontend as separate applications. Configure the backend environment variables and provide reachable MongoDB Atlas and Cloudflare R2 services. Set backend `NODE_ENV=production` and `CLIENT_URL` to the exact deployed frontend origin or comma-separated origins; production CORS does not implicitly allow localhost. Set frontend `VITE_API_BASE_URL` at build time to the public API base URL including `/api`. `VITE_` values are public, so database, JWT, and R2 credentials must remain backend-only.

The repository includes a Render Blueprint for backend and static frontend configuration at [`render.yaml`](render.yaml); automatic deploys are disabled. Set frontend `VITE_API_BASE_URL` to the deployed API URL ending in `/api`, then set backend `CLIENT_URL` to the exact frontend origin. Review [backend deployment configuration](backend/README.md#production-deployment-prerequisites) and [frontend deployment configuration](frontend/README.md#render-static-site) before creating the services.
