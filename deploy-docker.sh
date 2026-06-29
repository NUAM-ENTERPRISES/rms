#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Affiniks RMS — Docker production deployment
# Usage:  ./deploy-docker.sh [--dry-run]
# Requires: Docker, docker compose, backend/.env on the server
# ---------------------------------------------------------------------------

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="backend/.env"
HEALTH_URL="http://localhost:3000/health"
HEALTH_TIMEOUT=120
DRY_RUN=false
SKIP_GIT=false
IMAGE_TAG="${IMAGE_TAG:-latest}"
# Registry image paths (defaults matching GHCR setup; Docker requires lowercase)
IMAGE_NAME_BACKEND="$(echo "${IMAGE_NAME_BACKEND:-nuam-enterprises/rms-backend}" | tr '[:upper:]' '[:lower:]')"
IMAGE_NAME_WEB="$(echo "${IMAGE_NAME_WEB:-nuam-enterprises/rms-web}" | tr '[:upper:]' '[:lower:]')"
export IMAGE_TAG IMAGE_NAME_BACKEND IMAGE_NAME_WEB

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

for arg in "$@"; do
  case $arg in
    --dry-run)    DRY_RUN=true ;;
    --skip-git)   SKIP_GIT=true ;;
    --tag=*)      IMAGE_TAG="${arg#*=}" ;;
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

if $SKIP_GIT; then
  log "Skipping git fetch/reset (using local files)..."
else
  log "Fetching latest code from origin/main..."
  run git fetch --prune origin main
  run git reset --hard origin/main
fi

COMMIT=$(git rev-parse --short HEAD)
log "Deployment context commit: $COMMIT"
log "Target Image Tag: $IMAGE_TAG"

# Mobile app is not used in Docker prod — remove after git reset to save disk on the VM.
if [[ -d app ]]; then
  log "Removing app/ (React Native — not deployed on this server)..."
  run rm -rf app
fi

compose() {
  IMAGE_TAG="$IMAGE_TAG" \
  IMAGE_NAME_BACKEND="$IMAGE_NAME_BACKEND" \
  IMAGE_NAME_WEB="$IMAGE_NAME_WEB" \
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

log "Pulling latest images from GHCR..."
log "  backend → ghcr.io/${IMAGE_NAME_BACKEND}:${IMAGE_TAG}"
log "  web     → ghcr.io/${IMAGE_NAME_WEB}:${IMAGE_TAG}"
run compose pull

log "Starting production stack..."
run compose up -d

log "Cleaning up old images..."
run docker image prune -f

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
run compose ps

log "Deployment complete — commit $COMMIT"
