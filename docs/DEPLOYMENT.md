# Deployment

## Environment Variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `production` disables dev-only routes (`/auth/dev-login`) and the Quick Login UI, and tightens error responses |
| `PORT` | Backend port (5007 in production) |
| `CLIENT_URL` | Frontend origin — drives CORS, email links, and Socket.io CORS (`FRONTEND_URL` is still read as a fallback for older deployments) |
| `MONGO_URI` | MongoDB connection string — point to Atlas (or another managed cluster) in production |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Two distinct secrets (never one shared value), 32+ random characters in production, never reused from dev |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | Token lifetimes (default 15m / 7d) |
| `SMTP_*`, `EMAIL_FROM` | Nodemailer credentials for password-reset/verification emails |
| `MAX_FILE_SIZE`, `UPLOAD_PATH` | File-upload size limit; `UPLOAD_PATH` is legacy and unused now that all uploads go to GridFS |
| `RATE_LIMIT_WINDOW_MINUTES`, `RATE_LIMIT_PUBLIC`, `RATE_LIMIT_STUDENT`, `RATE_LIMIT_TEACHER`, `RATE_LIMIT_ADMIN`, `RATE_LIMIT_LOGIN` | Role-aware rate limits (see `server.js`) |
| `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` | Optional — AI Assistant runs in rule-based fallback mode without it, never fails |

Copy `server/.env.example` and `client/.env.example` as the starting point; never commit real secrets.

## Pre-Deployment Checklist

1. **Secrets** — rotate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` to production-strength random values.
2. **Database** — point `MONGO_URI` at a managed MongoDB instance (Atlas or equivalent); ensure the connection string's IP allowlist includes the deployment host.
3. **HTTPS** — required in production: refresh cookies are issued with `secure: true` in that mode, so the app must be served over HTTPS or the refresh flow silently fails.
4. **File storage** — all uploads (avatars, course/article images, success-story images, the academy logo, homework attachments, payment proofs) are stored in MongoDB GridFS (`server/src/config/gridfs.js`, bucket `media`), not local disk. This survives redeploys and scales across multiple backend instances automatically since it lives in the same MongoDB (Atlas) instance as everything else — no separate object-storage service required. Served through one unified endpoint, `GET /api/v1/media/:id`; see `docs/MEDIA_SYSTEM.md`.
5. **Cron jobs** (`server/src/jobs/*.job.js` — session reminders, subscription expiry, teacher attendance sweep) run in-process via `node-cron`; if you deploy multiple backend instances, either run cron on a single designated instance or move to a distributed scheduler to avoid duplicate execution.
6. **Seed data** — run `npm run seed` once against a fresh environment for demo/staging only. **Never run it against a live production database** (it wipes existing collections).
7. **Build** — `cd client && npm run build`, serve the `dist/` output via your static host or reverse-proxy it behind the API.
8. **Process manager** — run the backend under PM2 (or equivalent) with auto-restart, not raw `node server.js`.
9. **Rate limits** — the dev-tuned auth limiter (500/15min) should already fall back to the stricter production value (20/15min) automatically via `NODE_ENV`; verify this took effect after deploy.

## Verification After Deploy

- Hit a public endpoint (`GET /api/v1/courses`) to confirm the API is reachable.
- Log in with a real (non-dev) account and confirm the refresh flow survives a page reload (HTTPS + secure cookies working).
- Confirm file uploads (avatar, payment proof) persist after a redeploy — they live in MongoDB GridFS, so this should always pass regardless of which backend instance/redeploy serves the request.

See `../DEPLOYMENT_CHECKLIST.md` at the project root for the full server provisioning, PM2, Nginx, and SSL setup.
