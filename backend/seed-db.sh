#!/usr/bin/env bash
# Seed the database safely for local + VPS use.
# Always regenerates the Prisma client first so seed.ts matches the current schema
# (avoids TS2353 errors like RoleCatalog.professionType on a stale @prisma/client).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Installing npm dependencies..."
npm install

if ! awk '/^model RoleCatalog[[:space:]]*\{/,/^}/' prisma/schema.prisma | grep -q 'professionType'; then
  echo "ERROR: RoleCatalog.professionType is missing from prisma/schema.prisma." >&2
  echo "Pull/deploy the commit that includes migration 20260716150000_role_catalog_profession_type_fk, then retry." >&2
  exit 1
fi

echo "==> Generating Prisma client from current schema..."
npx prisma generate

echo "==> Applying pending Prisma migrations..."
npx prisma migrate deploy

echo "==> Seeding database..."
npx ts-node prisma/seed.ts

echo "==> Seed complete."
