#!/usr/bin/env bash
# SQLite backup script — RC4 operational readiness
set -euo pipefail

DB_PATH="${AFH_DATABASE_PATH:-./data/afh.sqlite}"
BROKER_PATH="${AFH_BROKER_DATABASE_PATH:-./data/broker.sqlite}"
BACKUP_DIR="${AFH_BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

for SRC in "$DB_PATH" "$BROKER_PATH"; do
  if [[ ! -f "$SRC" ]]; then
    echo "skip missing $SRC" >&2
    continue
  fi
  BASE="$(basename "$SRC" .sqlite)"
  DEST="$BACKUP_DIR/${BASE}-${STAMP}.sqlite"
  cp "$SRC" "$DEST"
  echo "backed up $SRC -> $DEST"
done

echo "backup complete"
