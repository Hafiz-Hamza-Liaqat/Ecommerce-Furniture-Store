#!/usr/bin/env bash
# Runtime data backup script — RC10.8 launch readiness.
# Prefer sqlite3's online backup API. If sqlite3 is unavailable, stop the
# runtime before invoking this script so file copies cannot race WAL writes.
set -euo pipefail

DB_PATH="${AFH_DATABASE_PATH:-./data/afh.sqlite}"
BROKER_PATH="${AFH_BROKER_DATABASE_PATH:-./data/broker.sqlite}"
DATA_DIR="$(dirname "$DB_PATH")"
CX_SYNC_DIR="${AFH_CX_SYNC_DIR:-$DATA_DIR/cx-sync}"
DAM_OBJECTS_DIR="${AFH_DAM_OBJECTS_DIR:-$DATA_DIR/dam-objects}"
BACKUP_DIR="${AFH_BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

backup_sqlite() {
  local src="$1"
  local dest="$2"
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$src" ".backup '$dest'"
  else
    echo "warning: sqlite3 unavailable; runtime must be stopped for safe copy" >&2
    cp "$src" "$dest"
  fi
}

for SRC in "$DB_PATH" "$BROKER_PATH"; do
  if [[ ! -f "$SRC" ]]; then
    echo "skip missing $SRC" >&2
    continue
  fi
  BASE="$(basename "$SRC" .sqlite)"
  DEST="$BACKUP_DIR/${BASE}-${STAMP}.sqlite"
  backup_sqlite "$SRC" "$DEST"
  echo "backed up $SRC -> $DEST"
done

for ENTRY in "cx-sync:$CX_SYNC_DIR" "dam-objects:$DAM_OBJECTS_DIR"; do
  LABEL="${ENTRY%%:*}"
  SRC="${ENTRY#*:}"
  if [[ ! -d "$SRC" ]]; then
    echo "skip missing $SRC" >&2
    continue
  fi
  DEST="$BACKUP_DIR/${LABEL}-${STAMP}"
  cp -R "$SRC" "$DEST"
  echo "backed up $SRC -> $DEST"
done

echo "backup complete"
