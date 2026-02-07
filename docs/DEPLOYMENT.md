# Deployment Guide

This document covers production deployment for the POS backend and frontend, including required environment variables and security notes.

---

## Frontend: `VITE_API_URL` (required in production)

The frontend **must** have `VITE_API_URL` set when built for production. The API client uses this to talk to the backend; without it, the app falls back to `/api` (same-origin), which will fail when the frontend is served from a different host (e.g. Vercel) than the backend (e.g. Render).

- **Set `VITE_API_URL`** to your backend base URL including the API path.
- **Example:** `https://pos-backend-abc123.onrender.com/api`
- **Include the `/api` path** if your backend mounts routes under `/api`.

Where to set it:

- **Vercel:** Project → Settings → Environment Variables → add `VITE_API_URL` = `https://your-backend.onrender.com/api` for Production (and Preview if needed).
- **Other hosts:** Set the variable in the build environment so it is available at build time (Vite inlines it).

After deployment, check the browser console: you should see `[API Client] Using VITE_API_URL: https://...` in development; in production, if `VITE_API_URL` is not set, you will see a warning and API calls will likely fail.

---

## Backend: Environment variables

See the backend’s `.env.example` and platform-specific guides (e.g. `RENDER_MANUAL_DEPLOYMENT.md`) for the full list. Key ones:

- `NODE_ENV=production`
- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL` (required)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: used for admin login. Use strong, unique values; do not commit them. Consider moving to a DB-backed admin user with hashed password and MFA later.

---

## Security notes

- **Admin credentials:** Stored in env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`). Ensure they are strong and not committed. Prefer migrating to a proper admin user in the DB with hashed password and MFA.
- **Store isolation:** Store context is taken from the JWT (`req.user?.storeId`) or server-derived data only. Endpoints that filter by store do not trust `storeId` from request body or query for non-admin users. See `docs/STORE_ISOLATION_AUDIT.md` for the audit.
