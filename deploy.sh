#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Affiniks RMS — Backend deployment script
# Usage:  ./deploy.sh [--skip-seed] [--skip-migrate] [--dry-run]
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
APP_NAME="rms-app"
DEPLOY_DIR="/var/www/rms/backend"
BUILD_MEM="3584"        # MB allocated to the NestJS build step
MIN_FREE_MEM=300        # MB — warn if available RAM drops below this
HEALTH_TIMEOUT=60      # seconds to wait for the app to become healthy
HEALTH_URL="http://localhost:3000/health"

# ── Flags ───────────────────────────────────────────────────────────────────
SKIP_SEED=false
SKIP_MIGRATE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-seed)    SKIP_SEED=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    --dry-run)      DRY_RUN=true  ;;
    *) echo "Unknown flag: $arg" && exit 1 ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
warn() { echo "[$(date '+%H:%M:%S')] WARNING: $*" >&2; }
die()  { echo "[$(date '+%H:%M:%S')] ERROR: $*" >&2; exit 1; }

run() {
  if $DRY_RUN; then
    log "[DRY-RUN] $*"
  else
    "$@"
  fi
}

# ── Pre-flight ───────────────────────────────────────────────────────────────
log "Starting deployment for $APP_NAME"

command -v node  >/dev/null 2>&1 || die "node not found in PATH"
command -v npm   >/dev/null 2>&1 || die "npm not found in PATH"
command -v pm2   >/dev/null 2>&1 || die "pm2 not found in PATH"
command -v git   >/dev/null 2>&1 || die "git not found in PATH"

# Free memory check (Linux only; skip gracefully on macOS)
if command -v free >/dev/null 2>&1; then
  AVAILABLE_MEM=$(free -m | awk '/^Mem:/ {print $7}')
  if [ "$AVAILABLE_MEM" -lt "$MIN_FREE_MEM" ]; then
    warn "Only ${AVAILABLE_MEM} MB available — build may OOM (threshold: ${MIN_FREE_MEM} MB)"
  else
    log "Available memory: ${AVAILABLE_MEM} MB"
  fi
fi

[[ -d "$DEPLOY_DIR" ]] || die "Deploy directory not found: $DEPLOY_DIR"
cd "$DEPLOY_DIR"

# ── Pull latest code ─────────────────────────────────────────────────────────
log "Fetching latest code from origin/main..."
run git fetch --prune origin main
run git reset --hard origin/main

COMMIT=$(git rev-parse --short HEAD)
log "Deployed commit: $COMMIT"

# ── Clean stale artefacts ─────────────────────────────────────────────────────
log "Flushing PM2 logs..."
run pm2 flush "$APP_NAME" || true

log "Cleaning Prisma and npm caches..."
# Do NOT remove dist/ here — matching the known-good deploy flow: deleting dist/ without also
# reliably wiping *.tsbuildinfo leaves TypeScript incremental in a state where it exits 0 and
# emits nothing. The old script kept dist/ across deploys and used dist/src/main.js for PM2.
run rm -rf node_modules/.prisma node_modules/.cache

# Wipe incremental fingerprints so the next compile always re-checks outputs (safe with dist/ kept).
if $DRY_RUN; then
  log "[DRY-RUN] rm -f tsconfig*.tsbuildinfo ./*.tsbuildinfo"
else
  rm -f tsconfig.build.tsbuildinfo tsconfig.tsbuildinfo ./*.tsbuildinfo 2>/dev/null || true
fi

# ── Install dependencies ──────────────────────────────────────────────────────
log "Installing npm dependencies..."
run npm ci --prefer-offline

# ── Prisma ───────────────────────────────────────────────────────────────────
if grep -q '"@prisma/client"' package.json; then
  if ! $SKIP_MIGRATE; then
    log "Running Prisma migrations..."
    run npx prisma migrate deploy
  else
    log "Skipping Prisma migrations (--skip-migrate)"
  fi

  log "Generating Prisma client..."
  run npx prisma generate

  if ! $SKIP_SEED; then
    log "Running database seed..."
    run npm run db:seed || warn "db:seed exited non-zero — check seed output above"
  else
    log "Skipping seed (--skip-seed)"
  fi
fi

# ── Build ─────────────────────────────────────────────────────────────────────
log "Building NestJS application..."
export NODE_OPTIONS="--max-old-space-size=${BUILD_MEM}"
run npm run build
unset NODE_OPTIONS

BACKEND_ENTRY=""
for candidate in dist/src/main.js dist/main.js; do
  if [[ -f "$candidate" ]]; then
    BACKEND_ENTRY="$candidate"
    break
  fi
done

if [[ -z "$BACKEND_ENTRY" ]] && ! $DRY_RUN; then
  if [[ -d dist ]]; then
    warn "dist/ contents (first 40 lines):"
    ls -la dist | head -40
    warn "main.js under dist (up to 20 paths):"
    find dist -name main.js -print 2>/dev/null | head -20 || true
  else
    warn "dist/ directory missing after build (check nest/tsc errors above)"
  fi
  die "Nest build entry not found (tried dist/src/main.js and dist/main.js)"
fi

if $DRY_RUN && [[ -z "$BACKEND_ENTRY" ]]; then
  BACKEND_ENTRY="dist/src/main.js"
fi

if [[ -n "$BACKEND_ENTRY" ]]; then
  log "Backend entry: $BACKEND_ENTRY"
fi

# ── Restart PM2 ───────────────────────────────────────────────────────────────
log "Restarting PM2 process..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  run pm2 restart "$APP_NAME" --update-env
else
  warn "PM2 process '$APP_NAME' not found — starting fresh"
  run pm2 start "$BACKEND_ENTRY" \
    --name "$APP_NAME" \
    -i 2 \
    --update-env \
    --max-memory-restart 800M \
    --log-date-format "YYYY-MM-DD HH:mm:ss"
fi

log "Saving PM2 process list..."
run pm2 save

# ── Health check ───────────────────────────────────────────────────────────────
if ! $DRY_RUN; then
  log "Waiting for app to become healthy (up to ${HEALTH_TIMEOUT}s)..."
  ELAPSED=0
  until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
      warn "Health check timed out after ${HEALTH_TIMEOUT}s — inspect logs with: pm2 logs $APP_NAME"
      break
    fi
  done
  if [ "$ELAPSED" -lt "$HEALTH_TIMEOUT" ]; then
    log "App is healthy after ${ELAPSED}s"
  fi
fi

# ── Frontend Build ────────────────────────────────────────────────────────────
WEB_DIR="/var/www/rms/web"

if [[ -d "$WEB_DIR" ]]; then
  log "Building frontend..."
  cd "$WEB_DIR"

  run git fetch --prune origin main
  run git reset --hard origin/main

  run npm ci --prefer-offline

  export NODE_OPTIONS="--max-old-space-size=2560"
  run npm run build
  unset NODE_OPTIONS

  log "Frontend build complete"
else
  log "Frontend directory not found at $WEB_DIR — skipping"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log "PM2 status:"
pm2 show "$APP_NAME" | grep -E "status|uptime|restarts|memory" || true

log "Deployment complete — commit $COMMIT"
