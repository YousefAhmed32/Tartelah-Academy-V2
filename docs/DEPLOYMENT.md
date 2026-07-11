# Deployment

## Environment Variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` disables dev-only routes (`/auth/dev-login`) and the Quick Login UI, and tightens rate limits |
| `PORT` | Backend port (default 5000) |
| `FRONTEND_URL` | Used for CORS + email links |
| `MONGO_URI` | MongoDB connection string — point to Atlas (or another managed cluster) in production |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Must be 32+ random characters in production, never reused from dev |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Token lifetimes (default 15m / 7d) |
| `SMTP_*`, `EMAIL_FROM` | Nodemailer credentials for password-reset/verification emails |
| `MAX_FILE_SIZE`, `UPLOAD_PATH` | Local file-upload limits and directory |
| `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX` | General API rate limit (see `API_REFERENCE.md`) |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` | Optional — AI Assistant runs in rule-based fallback mode without it, never fails |

Copy `server/.env.example` and `client/.env.example` as the starting point; never commit real secrets.

## Pre-Deployment Checklist

1. **Secrets** — rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` to production-strength random values.
2. **Database** — point `MONGO_URI` at a managed MongoDB instance (Atlas or equivalent); ensure the connection string's IP allowlist includes the deployment host.
3. **HTTPS** — required in production: refresh cookies are issued with `secure: true` in that mode, so the app must be served over HTTPS or the refresh flow silently fails.
4. **File storage** — the current implementation writes uploads to local disk (`server/uploads/`), which does **not** survive a redeploy on most PaaS platforms and doesn't scale across multiple instances. Migrate to S3/Cloudinary before scaling beyond a single persistent server — see `KNOWN_LIMITATIONS.md`.
5. **Cron jobs** (`server/src/jobs/*.job.js` — session reminders, subscription expiry, teacher attendance sweep) run in-process via `node-cron`; if you deploy multiple backend instances, either run cron on a single designated instance or move to a distributed scheduler to avoid duplicate execution.
6. **Seed data** — run `npm run seed` once against a fresh environment for demo/staging only. **Never run it against a live production database** (it wipes existing collections).
7. **Build** — `cd client && npm run build`, serve the `dist/` output via your static host or reverse-proxy it behind the API.
8. **Process manager** — run the backend under PM2 (or equivalent) with auto-restart, not raw `node server.js`.
9. **Rate limits** — the dev-tuned auth limiter (500/15min) should already fall back to the stricter production value (20/15min) automatically via `NODE_ENV`; verify this took effect after deploy.

## Verification After Deploy

- Hit a public endpoint (`GET /api/v1/courses`) to confirm the API is reachable.
- Log in with a real (non-dev) account and confirm the refresh flow survives a page reload (HTTPS + secure cookies working).
- Confirm file uploads (avatar, payment proof) persist after a redeploy if using local storage — if they don't, that confirms the S3/Cloudinary migration is now required, not optional.
