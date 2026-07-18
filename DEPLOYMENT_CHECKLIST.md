# Deployment Checklist — Tartelah Online

Production domain: `https://tartelah.com` · Backend port: `5007` · Stack: Node/Express/MongoDB + React/Vite, PM2 + Nginx + Let's Encrypt on Ubuntu.

This is the step-by-step, ordered checklist for a fresh server or a redeploy. For a description of what each env var does, see `docs/DEPLOYMENT.md`.

---

## 1. Project Structure

```
Tartelah Academy-V2/
├── client/          React + Vite frontend
│   ├── .env.example
│   └── dist/         ← build output, served by Nginx
├── server/          Express + MongoDB backend
│   ├── .env.example
│   ├── ecosystem.config.js   ← PM2 process definition
│   └── server.js
└── DEPLOYMENT_CHECKLIST.md  ← this file
```

---

## 2. Server Provisioning (one-time)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2

# MongoDB: use a managed cluster (Atlas or equivalent) in production rather
# than self-hosting — simpler backups, no local DB ops burden.
```

---

## 3. Clone & Install

```bash
git clone <repo-url> tartelah
cd tartelah

cd server && npm install --omit=dev && cd ..
cd client && npm install && cd ..
```

---

## 4. Environment Variables

### `server/.env` (copy from `server/.env.example`)

```env
NODE_ENV=production
PORT=5007
CLIENT_URL=https://tartelah.com

MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/tartelah?retryWrites=true&w=majority

JWT_ACCESS_SECRET=<32+ random chars — generate with: openssl rand -hex 32>
JWT_REFRESH_SECRET=<a DIFFERENT 32+ random string — never reuse the access secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<real sending address>
SMTP_PASS=<app password>
EMAIL_FROM=ترتيلة أونلاين <noreply@tartelah.com>

MAX_FILE_SIZE=5242880

RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_PUBLIC=300
RATE_LIMIT_STUDENT=1000
RATE_LIMIT_TEACHER=1000
RATE_LIMIT_ADMIN=3000
RATE_LIMIT_LOGIN=100

# Optional — AI Assistant falls back to deterministic rule-based mode without it
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-5.4-mini
```

**Never commit `server/.env`.** It's already gitignored.

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be two independent random values — this is intentional (compromising one token type never compromises the other). Do not collapse them into a single shared secret.
- File uploads (avatars, course/article images, homework, payment proofs) live in MongoDB GridFS — there is no local `uploads/` directory to provision and no S3/Cloudinary dependency to configure.
- There is no payment gateway (Stripe or otherwise) and no WhatsApp Business API integration in this codebase today — don't add credentials for services that aren't wired up.

### `client/.env.production` (or set at build time)

```env
VITE_API_URL=https://tartelah.com/api/v1
VITE_ENABLE_DEMO_LOGIN=false
```

`VITE_API_URL` is inlined into the JS bundle at build time by Vite — it must be correct **in the environment that runs `npm run build`**, not just on the server. If you build on CI or a different machine than the one serving the app, set this there.

---

## 5. Build

```bash
cd client
npm run build          # outputs to client/dist/
cd ..
```

---

## 6. Start with PM2

`server/ecosystem.config.js` is already checked in:

```bash
cd server
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # follow the printed command to enable boot persistence
```

Common PM2 commands:

```bash
pm2 status                    # process list
pm2 logs tartelah-api         # tail logs
pm2 restart tartelah-api      # restart after a redeploy
pm2 reload tartelah-api       # zero-downtime reload
pm2 stop tartelah-api
pm2 delete tartelah-api
```

**Run a single instance** (`instances: 1`, already set in `ecosystem.config.js`). The cron jobs in `server/src/jobs/*.job.js` (session reminders, subscription expiry, teacher attendance sweep) run in-process — running multiple PM2 instances would execute each cron job multiple times per tick. If you need horizontal scaling later, move cron scheduling to a single designated instance or an external scheduler first.

---

## 7. Nginx Configuration

`/etc/nginx/sites-available/tartelah.com`:

```nginx
# Frontend — static build
server {
    listen 80;
    server_name tartelah.com www.tartelah.com;

    root /var/www/tartelah/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API — proxy to the Node backend
    location /api/ {
        proxy_pass http://127.0.0.1:5007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO — needs the Upgrade headers for websockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://127.0.0.1:5007;
    }

    client_max_body_size 10m;   # matches server.js's express.json limit
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tartelah.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

The Express app already sets `app.set('trust proxy', 1)` (`server.js:52`), so `req.ip`/rate limiting work correctly behind this proxy — no extra config needed there.

---

## 8. SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tartelah.com -d www.tartelah.com
```

Certbot edits the Nginx config to add the 443 server block and HTTP→HTTPS redirect, and installs a renewal cron/systemd timer automatically. Verify renewal works:

```bash
sudo certbot renew --dry-run
```

`secure: true` on the refresh-token cookie (`server/src/controllers/auth.controller.js`) only activates when `NODE_ENV=production`, and requires the app to be served over HTTPS — without SSL, login sessions will silently fail to persist across page reloads.

---

## 9. Git Deployment Workflow

```bash
# On the server, for each redeploy:
cd /var/www/tartelah
git pull origin main

cd server && npm install --omit=dev && cd ..
cd client && npm install && npm run build && cd ..

pm2 reload tartelah-api    # zero-downtime
```

Consider wrapping this in a `deploy.sh` script once the workflow stabilizes.

---

## 10. Rollback Procedure

```bash
cd /var/www/tartelah
git log --oneline -10                 # find the last known-good commit
git checkout <previous-commit-sha>

cd server && npm install --omit=dev && cd ..
cd client && npm install && npm run build && cd ..

pm2 reload tartelah-api
```

If the rollback involves a schema change made via a migration script (`server/src/migrations/`), confirm the migration is additive/backward-compatible before rolling back application code — rolling back code does not roll back data.

---

## 11. Post-Deploy Verification

- `curl https://tartelah.com/health` → `{"success":true,"status":"ok",...}`
- `curl https://tartelah.com/api/v1/courses` → public endpoint responds
- Log in with a real account in a browser; confirm the session survives a page reload (validates HTTPS + secure cookies + CORS all agree on the same origin).
- Open the browser devtools Network tab and confirm the Socket.IO connection upgrades to `wss://` successfully (validates the Nginx `/socket.io/` block).
- `pm2 logs tartelah-api --lines 50` — confirm no startup errors, and confirm the three cron jobs log their "started" messages exactly once.

---

## 12. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Login works but session doesn't survive reload | Not served over HTTPS, or `CLIENT_URL` doesn't exactly match the frontend origin (cookie `secure`/CORS rejects it) |
| CORS errors in browser console | `CLIENT_URL` in `server/.env` doesn't match the actual frontend origin exactly (scheme + host, no trailing slash) |
| API calls hit `localhost` in production | `VITE_API_URL` wasn't set in the environment that ran `npm run build` — rebuild the client with it set, `import.meta.env` values are baked in, not read at runtime |
| Socket.IO falls back to polling / never connects | Nginx missing the `Upgrade`/`Connection` headers on the `/socket.io/` location block |
| 502 Bad Gateway | Backend process not running — check `pm2 status` and `pm2 logs tartelah-api` |
| Cron jobs (reminders, expiry, attendance sweep) run duplicated | More than one PM2 instance running — see §6, keep `instances: 1` |
| Emails never send | `SMTP_USER`/`SMTP_PASS` unset or still the placeholder value — the app silently no-ops email sending in that case (`server/src/services/email.service.js`), it does not error |
| File upload/image fails to load after redeploy | Should not happen — all uploads live in MongoDB GridFS, not local disk. If it does happen, check `MONGO_URI` connectivity, not disk paths |

---

## 13. Common Deployment Mistakes

- Building the client (`npm run build`) on a machine/CI where `VITE_API_URL` isn't set to the production URL — the build silently falls back to `http://localhost:5000/api/v1`.
- Running more than one PM2 instance of the API, duplicating cron job execution.
- Reusing the same secret for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Running `npm run seed` against the production database — it wipes existing collections. Only run it against a fresh/staging environment.
- Forgetting `client_max_body_size` in Nginx — uploads larger than Nginx's default 1MB will 413 before ever reaching Express's 10MB limit.
- Skipping `pm2 save` + `pm2 startup` — the app won't come back after a server reboot.

---

## 14. Known Manual Follow-Ups

These were identified during the production audit but are outside the scope of an automated fix (breaking dependency upgrades and endpoint-by-endpoint validation coverage both need dedicated testing time) — see the audit summary for full detail:

- `nodemailer` and `node-cron` have known high/moderate-severity advisories; fixing them requires major-version upgrades (breaking changes to both APIs) that need their own testing pass.
- Only 3 of 24 backend route files use explicit Joi request-body validation; the rest rely on Mongoose schema validation alone. Recommend adding `validate()` + Joi schemas to the remaining state-changing (POST/PUT/PATCH) admin and public-form endpoints incrementally.
