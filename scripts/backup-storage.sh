#!/usr/bin/env bash
set -euo pipefail

storage_alias="${AGENDAI_S3_ALIAS:-agendai}"
bucket="${S3_BUCKET:-agendai-local}"
backup_root="${AGENDAI_BACKUP_DIR:-backups}/object-storage"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_root/$timestamp"

command -v mc >/dev/null 2>&1 || { echo 'Instale o cliente MinIO mc antes de continuar.' >&2; exit 1; }
mkdir -p "$backup_root"
mc mirror --preserve "$storage_alias/$bucket" "$target"
printf 'Cópia dos ficheiros criada: %s\n' "$target"
