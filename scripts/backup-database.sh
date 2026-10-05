#!/usr/bin/env bash
set -euo pipefail

backup_dir="${AGENDAI_BACKUP_DIR:-backups/database}"
database_user="${POSTGRES_USER:-agendai}"
database_name="${POSTGRES_DB:-agendai}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/agendai-$timestamp.dump"
partial="$target.partial"

mkdir -p "$backup_dir"
trap 'rm -f "$partial"' EXIT
docker compose exec -T database pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --username="$database_user" \
  "$database_name" > "$partial"
test -s "$partial"
mv "$partial" "$target"
trap - EXIT
printf 'Cópia criada: %s\n' "$target"
