#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Affiniks RMS — Docker production deployment
# Usage:  ./deploy-docker.sh [--skip-build] [--dry-run]
# Requires: Docker, docker compose, backend/.env on the server
# ---------------------------------------------------------------------------

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="backend/.env"
HEALTH_URL="http://localhost:3000/health"
HEALTH_TIMEOUT=120
SKIP_BUILD=false
DRY_RUN=false

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --dry-run)    DRY_RUN=true ;;
    *) echo "Unknown flag: $arg" && exit 1 ;;
  esac
done

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

log "Starting Docker production deployment"

command -v docker >/dev/null 2>&1 || die "docker not found in PATH"
docker compose version >/dev/null 2>&1 || die "docker compose not available"

[[ -f "$ENV_FILE" ]] || die "$ENV_FILE not found — copy backend/.env.example to backend/.env on the server"

log "Fetching latest code from origin/main..."
run git fetch --prune origin main
run git reset --hard origin/main

COMMIT=$(git rev-parse --short HEAD)
log "Deployed commit: $COMMIT"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

if ! $SKIP_BUILD; then
  log "Building production images..."
  if $DRY_RUN; then
    log "[DRY-RUN] docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build"
  else
    compose build
  fi
else
  log "Skipping image build (--skip-build)"
fi

log "Starting production stack..."
if $DRY_RUN; then
  log "[DRY-RUN] docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d"
else
  compose up -d
fi

if ! $DRY_RUN; then
  log "Waiting for backend health (up to ${HEALTH_TIMEOUT}s)..."
  ELAPSED=0
  until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
      warn "Health check timed out — backend logs:"
      compose logs backend --tail 50 || true
      die "Backend did not become healthy within ${HEALTH_TIMEOUT}s"
    fi
  done
  log "Backend healthy after ${ELAPSED}s"
fi

log "Container status:"
if $DRY_RUN; then
  log "[DRY-RUN] compose ps"
else
  compose ps
fi

log "Deployment complete — commit $COMMIT"
