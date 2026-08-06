#!/usr/bin/env bash
# Monorepo wrapper — delegates to backend/seed-db.sh
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend/seed-db.sh"
