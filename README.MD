# Multi-App Sample (Next.js + Angular1 + Angular2 + .NET 9)

Single-origin demo with **secure session cookies** across:
- **/api** → .NET 9 Minimal API (auth + session)
- **/** → Next.js hub (OTP login + Resume Application)
- **/angular1** → Angular User app (auto recognizes session)
- **/angular2** → Angular Admin app (admin login + dashboard → deep-link to Angular1)

Runs locally behind **Nginx** over **HTTPS** so cookie flags match production (**HttpOnly; Secure; SameSite=Lax; Path=/**). Target production shape: Azure + Cloudflare.

---

## 1) Repo Structure

```
/backend-dotnet/Backend          # .NET 9 API (Minimal API)
/frontend-nextjs                 # Next.js App Router hub
/frontend-angular1               # Angular (user)
/frontend-angular2               # Angular (admin)
/ops                             
  /certs                         # mkcert TLS certs (generated locally)
  /nginx/nginx.conf              # Edge reverse proxy
  compose.yml                    # Docker Compose (proxy + containers)
/README.md
```

> The Angular apps are built for subpaths and served by their own Nginx-in-container (ports 4201/4202). The edge Nginx routes `/:3000`, `/angular1/:4201`, `/angular2/:4202`, `/api/:8080`.

---

## 2) Prerequisites (macOS)

- **Docker Desktop**
- **Node.js 20+** (for local dev of FE if needed)
- **.NET 9 SDK**
- **mkcert**: `brew install mkcert nss`
- (Optional) **Azure CLI** if deploying

Confirm Docker is up:
```bash
docker info >/dev/null && echo "Docker is up"
```

---

## 3) Local HTTPS & Hostname

### 3.1 Hosts entry
Add to `/etc/hosts`:
```
127.0.0.1   dev.localhost.test
```

### 3.2 mkcert TLS certs
```bash
mkcert -install
mkdir -p ops/certs
cd ops/certs
mkcert dev.localhost.test
# Rename for clarity (optional)
mv dev.localhost.test.pem dev.localhost.test.crt
mv dev.localhost.test-key.pem dev.localhost.test.key
```

---

## 4) Build the Services

### 4.1 Backend (.NET 9)
The API issues/validates the `sid` session cookie and exposes:
- `POST /api/auth/login/otp`
- `POST /api/auth/login/admin`
- `GET  /api/auth/me`
- `POST /api/auth/logout`
- `GET  /api/admin/applications` (admin only)
- `GET  /api/health`

**Dockerfile** is in `backend-dotnet/Backend/`. The container listens on `8080` and uses `ASPNETCORE_PATHBASE=/api`.

### 4.2 Next.js (hub)
**Dockerfile** in `frontend-nextjs/`. The container listens on `3000`.  
FE fetches must use `credentials: 'include'` and call relative paths like `/api/auth/me`.

### 4.3 Angular1 (user)
Built for `/angular1/` and served by Nginx at `:4201`.  
Build step sets:
- `--base-href /angular1/ --deploy-url /angular1/`

### 4.4 Angular2 (admin)
Built for `/angular2/` and served by Nginx at `:4202`.  
Build step sets:
- `--base-href /angular2/ --deploy-url /angular2/`

---

## 5) Edge Nginx Reverse Proxy (HTTPS, single origin)

`ops/nginx/nginx.conf` (summary):
- Listens on `443` with your mkcert certs.
- Routes:
  - `/` → `next:3000`
  - `/angular1/` → `angular1:4201`
  - `/angular2/` → `angular2:4202`
  - `/api/` → `api:8080`
- Sets `X-Forwarded-Proto https` so the API sets **Secure** cookies.

---

## 6) One-Command Local Run

From repo root:
```bash
cd ops
docker compose -f compose.yml up --build
```

Open:
- Hub → **https://dev.localhost.test/**
- User app → **https://dev.localhost.test/angular1/**
- Admin app → **https://dev.localhost.test/angular2/**
- Health → **https://dev.localhost.test/api/health**

> If port 443 is busy, change `ports: - "8443:443"` in `ops/compose.yml` and use `https://dev.localhost.test:8443/` in commands below (add `--resolve dev.localhost.test:8443:127.0.0.1` to curls).

---

## 7) Simulated Credentials

- **OTP login (Next.js flow):**
  - `phone=50412345678`
  - `otp=123456`
- **Admin login (Angular2 flow):**
  - `email=admin@example.com`
  - `password=admin123`

---

## 8) How to Test (Manual + Curl)

### 8.1 Manual Flows

**A) Next.js → Angular1**
1. Go to **/login** on the hub; submit phone + OTP.
2. Click **Resume Application** → **/angular1/**.
3. Angular1 shows “Welcome, {name}”.
4. Click **Back to Home** → still authenticated on hub.

**B) Angular2 → Angular1**
1. Go to **/angular2/login**; sign in as admin.
2. See dashboard list (from `/api/admin/applications`).
3. Click first item → **/angular1/?from=admin**.  
   Angular1 shows welcome + **Admin header**.

### 8.2 Curl Sanity

> Add `--resolve dev.localhost.test:443:127.0.0.1` if needed to bypass DNS caching.

**Health**
```bash
curl -i https://dev.localhost.test/api/health
```

**Unauthenticated**
```bash
curl -i https://dev.localhost.test/api/auth/me
```

**OTP login → session**
```bash
curl -i -c /tmp/user.txt \
  -X POST https://dev.localhost.test/api/auth/login/otp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "phone=50412345678&otp=123456"

curl -i -b /tmp/user.txt https://dev.localhost.test/api/auth/me
```

**Admin login → admin list**
```bash
curl -i -c /tmp/admin.txt \
  -X POST https://dev.localhost.test/api/auth/login/admin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "email=admin@example.com&password=admin123"

curl -i -b /tmp/admin.txt https://dev.localhost.test/api/auth/me
curl -i -b /tmp/admin.txt https://dev.localhost.test/api/admin/applications
```

**Logout**
```bash
curl -i -b /tmp/user.txt -X POST https://dev.localhost.test/api/auth/logout
```

Expected:
- Login responses set `Set-Cookie: sid=...; Path=/; HttpOnly; Secure; SameSite=Lax`.
- `/api/auth/me` flips to `authenticated:true`.
- Admin list returns 200 only with admin cookie.

---

## 9) Running FE in Dev Mode (optional)

If you want hot reload locally while still using the **single origin**:

- **Angular2 dev** (`http://localhost:4202`), access via proxy subpath:

Edge Nginx `location` (dev-only):
```nginx
location /angular2/ {
  # rewrite /angular2/* → /* so dev server (which serves at /) works
  rewrite ^/angular2/?(.*)$ /$1 break;
  proxy_pass http://host.docker.internal:4202;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Then:
```bash
cd frontend-angular2
ng serve --port 4202
# visit https://dev.localhost.test/angular2/
```

> For production builds (containerized), we do **not** rewrite and serve files under `/angular2/` directly inside the angular2 container.

Repeat similarly for Angular1 if needed.

---

## 10) Troubleshooting

**“Couldn’t connect to server” on 443**
- Docker not publishing 443. Ensure `ports: - "443:443"` on the **proxy** service; `docker ps` should show `0.0.0.0:443->443/tcp`.
- If 443 is busy, map `8443:443` and use `:8443` in URLs.

**Visiting `/angular2/` shows a placeholder / nothing**
- Edge Nginx missing routes. Ensure you have `location /angular2/ { proxy_pass ... }`.
- For dev-server testing, add the `rewrite` described above.

**Angular assets 404 under `/angular1/` or `/angular2/`**
- Build Angular with `--base-href /angularX/ --deploy-url /angularX/`.
- The Nginx in the Angular containers must serve files physically from `/usr/share/nginx/html/angularX/*` and include SPA fallback:
  ```
  try_files $uri $uri/ /angularX/index.html;
  ```

**`/api/*` 404 or 405**
- Don’t both strip `/api` in the proxy **and** set `ASPNETCORE_PATHBASE=/api`. Pick **one**:
  - Recommended: keep PathBase and don’t strip.

**Logged in but Angular says “not signed in”**
- Ensure FE requests use credentials:
  - Angular `HttpClient`: `{ withCredentials: true }`
  - Next.js `fetch`: `{ credentials: 'include' }`
- Must use **HTTPS** and **same origin**.

**Admin 403 on `/api/admin/applications`**
- Backend must set `ClaimTypes.Role = "admin"` on admin login.
- Route must require role: `RequireRole("admin")`.

---

## 11) Production Notes (Azure + Cloudflare)

- Keep a **single domain** (e.g., `app.example.com`) and path-based routing identical to dev.
- Terminate TLS at the edge (Cloudflare/Azure Gateway). Use **HSTS** in prod.
- Use **Redis** (Azure Cache for Redis) if you add server-side per-user state beyond the cookie auth ticket.
- Cache **static FE assets** only; bypass cache for `/api/*`.

---

## 12) Acceptance Checklist

- [ ] HTTPS at one origin; cookie flags: **HttpOnly; Secure; SameSite=Lax; Path=/** 
- [ ] **Flow A**: Next.js OTP login → Angular1 authenticated → back to hub still authenticated
- [ ] **Flow B**: Angular2 admin login → dashboard list → open Angular1 with admin header
- [ ] No tokens in web storage; all apps call `/api/*` with credentials
- [ ] Refresh/deeplinks work at `/angular1/*` and `/angular2/*`

---

## 13) Useful Commands

```bash
# Bring stack up
cd ops && docker compose -f compose.yml up --build

# Logs
docker compose -f ops/compose.yml logs proxy -f --tail=100
docker compose -f ops/compose.yml logs api -f --tail=100
docker compose -f ops/compose.yml logs next -f --tail=100
docker compose -f ops/compose.yml logs angular1 -f --tail=100
docker compose -f ops/compose.yml logs angular2 -f --tail=100

# Curl with forced DNS resolution (bypass cache)
curl -I --resolve dev.localhost.test:443:127.0.0.1 https://dev.localhost.test/
```


## Pending Items
- **Lock it down** – Re-verify cookie flags (`HttpOnly; Secure; SameSite=Lax; Path=/`), respect forwarded headers, add basic security headers (CSP/X-Content-Type-Options), and ensure `/api` is `Cache-Control: no-store`.

- **Make it sturdy** – Add Redis for session backing in prod (if needed), keep API stateless beyond the cookie ticket, and wire health checks at the edge + API.

- **CI/CD basics** – CI pipeline that builds/lints/tests all apps and a couple of dev shortcuts (`make up/down/logs` or npm scripts).

- **Docs polish** – Finalize README (diagram, mkcert steps, one-command run, creds, flows, troubleshooting) and add a solid `.gitignore`.

- **E2E proof** – Manual acceptance script plus a small Playwright e2e covering both flows (Next → Angular1, Angular2 → Angular1).

- **Prod scaffolding** – Azure path-based routing mirroring dev, Cloudflare DNS+TLS, cache only static FE assets, bypass `/api/*`, enable HSTS in prod.

- **Config hygiene** – Env vars for cookie/session/Redis; no secrets in repo; document local vs. prod settings.

- **Nice touches** – Simple `/health` pages for FE, structured API logs (request IDs), friendly 404/500 pages.

## Suggestions to Improve
- **E2E stability & speed** – Add Playwright tests to CI against a docker-compose env; implement a logging tools for  failures for fast debugging.

- **Infra as Code** – Check in Azure resources as Bicep/Terraform; include Cloudflare rules as code for repeatable deploys.

- **Observability** – Add basic tracing/log correlation (request-id headers), and ship logs to a single sink (e.g., Application Insights) for easy triage.

