# RMS UAT VPS — Security Hardening

This document records infrastructure and deployment security improvements applied to the **Affiniks RMS UAT environment** on a DigitalOcean VPS.

| Item | Value |
|------|-------|
| **Environment** | UAT / Production-like |
| **OS** | Ubuntu 25.04 |
| **Provider** | DigitalOcean |
| **App path** | `/var/www/rms` |
| **Public API** | `https://api-rms.nuamenterprises.com` |
| **Stack** | Docker Compose (`docker-compose.prod.yml`) |
| **Hardening window** | June 2026 |

---

## Architecture overview

```mermaid
flowchart TB
  subgraph internet [Internet]
    Users[Users / Browsers]
    GitHub[GitHub Actions]
  end

  subgraph vps [DigitalOcean VPS — Ubuntu 25.04]
    UFW[UFW Firewall — 22 80 443 only]
    Nginx[Host Nginx — TLS termination]
    subgraph docker [Docker Compose rms-prod]
      Web[web :8080 nginx static]
      Backend[backend 127.0.0.1:3000]
      Postgres[postgres internal]
      Redis[redis internal + requirepass]
    end
  end

  Users -->|HTTPS 443| UFW
  UFW --> Nginx
  Nginx -->|proxy_pass| Web
  Nginx -->|proxy_pass localhost:3000| Backend
  Backend --> Postgres
  Backend --> Redis
  GitHub -->|SSH verified host key| UFW
```

**Design principle:** Only Nginx faces the public internet on HTTP/HTTPS. Application services (backend, PostgreSQL, Redis) run on an internal Docker network. The backend API is not published on the host’s public interface.

---

## 1. Firewall hardening (UFW)

### Rationale

By default, all listening ports on a VPS may be reachable from the internet. Restricting inbound traffic to the minimum required ports reduces attack surface (direct API access, database probes, Redis scans, etc.).

### Implementation

**Date:** June 2026

```bash
# Enable UFW with safe defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only required services
sudo ufw allow OpenSSH    # port 22
sudo ufw allow 80/tcp     # HTTP (redirect / ACME)
sudo ufw allow 443/tcp    # HTTPS

# Enable (confirm when prompted if SSH is already allowed)
sudo ufw enable
```

### Verification

```bash
sudo ufw status verbose
sudo ufw status numbered
```

**Expected result:**

- `Status: active`
- Default incoming policy: `deny`
- Rules for 22, 80, 443 only
- No rule exposing 3000, 5432, or 6379 publicly

---

## 2. HTTPS enforcement

### Rationale

Serving the API and frontend over plain HTTP exposes credentials, JWTs, and session data to interception. TLS termination at Nginx ensures all public traffic is encrypted and enables security headers at the edge.

### Implementation

**Date:** June 2026

- Host **Nginx** configured as reverse proxy (not inside the Docker `web` container).
- **Let’s Encrypt** certificates issued for public hostnames (e.g. `api-rms.nuamenterprises.com`).
- HTTP (80) redirects or serves ACME challenges; HTTPS (443) serves application traffic.
- Security headers enabled in Nginx (examples):

```nginx
# Example — adjust per site block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Nginx proxies:

| Public hostname | Upstream |
|-----------------|----------|
| Frontend | `http://127.0.0.1:8080` (Docker `web` service) |
| API | `http://127.0.0.1:3000` (Docker `backend` service) |

### Verification

```bash
# TLS and certificate
curl -vI https://api-rms.nuamenterprises.com/health

# Confirm HTTP redirects or is not used for API traffic
curl -v http://api-rms.nuamenterprises.com/health
```

**Expected result:** Valid certificate, `200` on HTTPS health endpoint, security headers present in response.

---

## 3. Backend port protection

### Previous state

Docker published the backend on all host interfaces:

```yaml
ports:
  - "3000:3000"   # equivalent to 0.0.0.0:3000
```

Anyone could reach the API directly:

```text
http://SERVER_IP:3000
```

This bypassed Nginx TLS, rate limiting, and security headers.

### Security fix

**Date:** June 2026  
**File:** [`docker-compose.prod.yml`](../docker-compose.prod.yml)

```yaml
ports:
  # Localhost only — host Nginx proxies here; blocks direct public IP access
  - "127.0.0.1:3000:3000"
```

### Rationale

Binding to `127.0.0.1` ensures the backend is reachable only from processes on the same host (Nginx, `deploy-docker.sh` health checks). External clients must use the HTTPS API hostname.

### Deployment

```bash
cd /var/www/rms
git pull origin main
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d
```

### Verification

```bash
# On server — should succeed
curl -sf http://127.0.0.1:3000/health

# From outside the VPS — should fail (connection refused / timeout)
curl -v --connect-timeout 5 http://SERVER_IP:3000/health

# Public API via Nginx — should succeed
curl -sf https://api-rms.nuamenterprises.com/health

# Confirm bind address
ss -tlnp | grep 3000
# Expected: 127.0.0.1:3000 (not 0.0.0.0:3000)
```

---

## 4. JWT secret hardening

### Previous state

Default development values from [`backend/.env.example`](../backend/.env.example) were in use on the server:

```env
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
```

### Security fix

**Date:** June 2026

Generated strong random secrets on the VPS and updated `backend/.env` (never committed to git):

```bash
cd /var/www/rms

JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '/+=')

# Update backend/.env (use your editor or sed)
# JWT_SECRET=<generated>
# JWT_REFRESH_SECRET=<generated>

docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --force-recreate backend
```

### Rationale

Predictable JWT secrets allow token forgery and full account compromise. Production secrets must be long, random, and unique per environment.

### Verification

```bash
# Backend healthy after recreate
curl -sf http://127.0.0.1:3000/health

# Users must re-login (existing tokens invalidated after secret rotation)
curl -sf https://api-rms.nuamenterprises.com/health
```

**Note:** Rotating JWT secrets invalidates all outstanding access and refresh tokens. Plan this during a maintenance window.

---

## 5. PostgreSQL security

### Previous state

Weak or default database credentials (`postgres` / `postgres`).

### Security fix

**Date:** June 2026

1. Generated a strong `POSTGRES_PASSWORD` in `backend/.env`.
2. Updated compose-injected `DATABASE_URL` (see [`docker-compose.prod.yml`](../docker-compose.prod.yml)):

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-affiniks_rms}?schema=public
```

3. Recreated PostgreSQL and backend containers.

```bash
cd /var/www/rms
# After updating POSTGRES_USER / POSTGRES_PASSWORD in backend/.env
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --force-recreate postgres backend
```

### Rationale

PostgreSQL is not published to the host in production compose, but strong credentials protect against lateral movement if another container or process on the host is compromised.

### Verification

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env ps postgres
# Expected: healthy

docker compose -f docker-compose.prod.yml --env-file backend/.env exec postgres \
  pg_isready -U "$POSTGRES_USER" -d affiniks_rms

# Application-level (Prisma)
curl -sf http://127.0.0.1:3000/health
# Exercise a DB-backed API route via HTTPS after login
```

---

## 6. Redis authentication

### Previous state

Redis ran without a password. Any process on the Docker network could read/write queue data and pub/sub channels.

### Security fix

**Date:** June 2026  
**Files:** [`docker-compose.prod.yml`](../docker-compose.prod.yml), server `backend/.env`

**Redis service:**

```yaml
redis:
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    REDISCLI_AUTH: ${REDIS_PASSWORD}
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```

**Backend service:**

```yaml
REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
REDIS_HOST: redis
REDIS_PORT: 6379
REDIS_PASSWORD: ${REDIS_PASSWORD}
```

**Server `backend/.env`:**

```bash
REDIS_PASSWORD="$(openssl rand -base64 32 | tr -d '/+=')"
# REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

Deploy Redis and backend together to avoid auth mismatch:

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --force-recreate redis backend
```

### Rationale

Redis stores BullMQ job queues and Socket.IO pub/sub state. Password authentication limits access to the backend service even within the Docker network.

The NestJS app already supports `REDIS_PASSWORD` (BullMQ, `RedisIoAdapter`) — no application code changes were required.

### Verification

```bash
# Unauthenticated — must fail (unset REDISCLI_AUTH for this test)
docker compose -f docker-compose.prod.yml --env-file backend/.env \
  exec -e REDISCLI_AUTH= redis redis-cli ping
# Expected: NOAUTH

# Authenticated — must return PONG
docker compose -f docker-compose.prod.yml --env-file backend/.env \
  exec redis redis-cli ping

# Backend logs — look for successful Redis connection
docker compose -f docker-compose.prod.yml --env-file backend/.env logs backend --tail 50
```

---

## 7. GitHub Actions deployment hardening

### Previous workflow

```bash
ssh -o StrictHostKeyChecking=no user@server "cd /var/www/rms && ./deploy-docker.sh"
```

**Issue:** Disabling host key verification allows man-in-the-middle attacks during CI deploys.

### Security fix

**Date:** June 2026  
**File:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

```yaml
- name: Configure known hosts
  env:
    KNOWN_HOSTS: ${{ secrets.KNOWN_HOSTS }}
  run: |
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts
    chmod 644 ~/.ssh/known_hosts

- name: Deploy to VM (Docker)
  env:
    VM_USER: ${{ secrets.VM_USER }}
    VM_IP: ${{ secrets.VM_IP }}
  run: |
    ssh -o BatchMode=yes -o ConnectTimeout=30 \
      "${VM_USER}@${VM_IP}" \
      "cd /var/www/rms && ./deploy-docker.sh"
```

### GitHub secrets required

| Secret | Purpose |
|--------|---------|
| `VM_SSH_KEY` | Private SSH key for deploy user |
| `VM_USER` | SSH username |
| `VM_IP` | VPS public IP |
| `KNOWN_HOSTS` | Output of `ssh-keyscan -H VM_IP` |

Generate `KNOWN_HOSTS`:

```bash
ssh-keyscan -H YOUR_VM_IP
```

Paste the full output into the GitHub repository secret.

### Rationale

Verified host fingerprints ensure GitHub Actions connects only to the intended VPS. Combined with SSH key authentication, this follows standard secure CI/CD SSH practice.

### Verification

- Push to `main` and confirm the **Deploy RMS** workflow completes successfully.
- On the VPS, confirm the latest commit was deployed:

```bash
cd /var/www/rms && git rev-parse --short HEAD
docker compose -f docker-compose.prod.yml --env-file backend/.env ps
```

---

## 8. System updates

### Rationale

Unpatched OS and runtime packages are a common entry point for exploits. Keeping the base image and Node.js runtime current reduces known CVE exposure.

### Implementation

**Date:** June 2026

```bash
sudo apt update
sudo apt upgrade -y

# Node.js 20 (if managed via NodeSource or nvm on host — host Node is not used for prod app)
# Prod app runs inside Docker; host Node updated for tooling only
node -v   # verify Node 20.x after upgrade
```

### Verification

```bash
# Reboot if kernel updated (during maintenance window)
# sudo reboot

# After services recover
docker compose -f docker-compose.prod.yml --env-file backend/.env ps
curl -sf https://api-rms.nuamenterprises.com/health
```

---

## 9. Verification performed

The following checks were run after hardening:

| Check | Command / method | Expected |
|-------|------------------|----------|
| All containers running | `docker compose -f docker-compose.prod.yml --env-file backend/.env ps` | All services `Up`, healthchecks `healthy` |
| Backend health | `curl -sf http://127.0.0.1:3000/health` | `{"status":"ok"}` |
| PostgreSQL | `pg_isready` via compose exec | accepting connections |
| Redis auth | `redis-cli ping` with/without auth | PONG only when authenticated |
| Public API | `curl -sf https://api-rms.nuamenterprises.com/health` | `{"status":"ok"}` |
| Nginx proxy | HTTPS frontend + API hostnames | 200 responses |
| Port 3000 blocked publicly | `curl http://SERVER_IP:3000/health` from external machine | connection refused / timeout |
| HTTPS / TLS | `curl -vI https://api-rms.nuamenterprises.com` | valid certificate |
| UFW | `sudo ufw status` | active, 22/80/443 only |

---

## Current security status

### Completed

| Control | Status |
|---------|--------|
| UFW firewall (22, 80, 443 only) | Done |
| HTTPS (Let’s Encrypt + Nginx) | Done |
| Nginx reverse proxy | Done |
| Backend port isolation (`127.0.0.1:3000`) | Done |
| Strong JWT secrets | Done |
| PostgreSQL strong credentials | Done |
| Redis authentication (`requirepass`) | Done |
| GitHub Actions SSH host verification | Done |
| System package updates | Done |

### Remaining recommendations

| Item | Priority | Notes |
|------|----------|-------|
| Upgrade Ubuntu 25.04 → 25.10 | Medium | Schedule during maintenance window; test Docker + Nginx after upgrade |
| Docker container hardening | Medium | Add to `docker-compose.prod.yml` per service: `security_opt: ["no-new-privileges:true"]`, `cap_drop: ["ALL"]`, `read_only: true` where compatible |
| Frontend port isolation | Low | Bind `web` to `127.0.0.1:8080:80` (same pattern as backend) |
| SSH IP allowlisting | Medium | `sudo ufw allow from ADMIN_IP to any port 22` if admin IP is fixed |
| Secrets manager | Low | Move `backend/.env` to Doppler / Vault / 1Password CLI; render at deploy time |
| Container image scanning | Low | Add Trivy/Grype step in CI for built images |
| Redis / Postgres network segmentation | Low | Split compose into `public` and `private` Docker networks |
| Automated backups + restore test | High | Encrypted off-site PostgreSQL backups; periodic restore drill |

---

## Rollback reference

If a hardening change causes an outage, use the relevant rollback:

**Backend port binding:**

```yaml
ports:
  - "3000:3000"   # revert only if emergency — re-apply localhost bind ASAP
```

**Redis auth:**

```bash
# Revert docker-compose.prod.yml redis command/env
# Remove REDIS_PASSWORD from backend/.env
docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --force-recreate redis backend
```

**GitHub Actions SSH:**

```bash
# Temporarily restore known_hosts step removal is NOT recommended
# Fix KNOWN_HOSTS secret instead:
ssh-keyscan -H VM_IP
```

---

## Related documentation

- [`docs/DOCKER_SETUP.md`](DOCKER_SETUP.md) — Docker dev/prod setup and environment variables
- [`docker-compose.prod.yml`](../docker-compose.prod.yml) — Production compose definition
- [`deploy-docker.sh`](../deploy-docker.sh) — Server deployment script
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — CI/CD deploy workflow
- [`backend/.env.example`](../backend/.env.example) — Environment variable template

---

*Last updated: June 2026 — Affiniks RMS UAT security hardening.*
