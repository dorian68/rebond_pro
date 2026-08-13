#!/bin/sh
# Atomic daily backup: PostgreSQL plus every object in the private/public
# Supabase buckets used by the application. Old backups rotate only on success.
set -eu
umask 077

ROOT=${REBONDPRO_ROOT:-/opt/rebondpro}
DIR=${REBONDPRO_BACKUP_DIR:-$ROOT/backups}
DB_CONTAINER=${REBONDPRO_DB_CONTAINER:-rebondpro-db}
APP_CONTAINER=${REBONDPRO_APP_CONTAINER:-rebondpro-app}
STAMP=$(date +%F-%H%M)
WORK="$DIR/.backup-$STAMP-$$"
DB_FINAL="$DIR/rebondpro-$STAMP.sql.gz"
STORAGE_FINAL="$DIR/rebondpro-storage-$STAMP.tar.gz"
STATUS_FINAL="$DIR/rebondpro-$STAMP.status"
COMPLETE=0

cleanup() {
  status=$?
  if [ "$COMPLETE" -ne 1 ] && [ -f "$DB_FINAL" ] && [ ! -f "$STATUS_FINAL" ]; then
    printf '%s\n' "$(date '+%F %T') PARTIAL: base sauvegardee; sauvegarde stockage incomplete" > "$STATUS_FINAL"
  fi
  rm -rf "$WORK"
  return "$status"
}
trap cleanup EXIT INT TERM

for cmd in docker gzip tar node
do
  command -v "$cmd" >/dev/null 2>&1 || { echo "backup FAILED: $cmd absent"; exit 1; }
done

mkdir -p "$DIR" "$WORK/storage"

if ! docker exec "$DB_CONTAINER" pg_dump -U rebondpro -d rebondpro --no-owner --no-privileges | gzip > "$WORK/database.sql.gz"; then
  echo "backup FAILED: pg_dump"
  exit 1
fi
gzip -t "$WORK/database.sql.gz"
[ "$(wc -c < "$WORK/database.sql.gz")" -ge 5000 ] || { echo "backup FAILED: dump anormalement petit"; exit 1; }

# Le dump PostgreSQL est déjà une sauvegarde autonome vérifiée. On le publie
# avant l'export documentaire afin qu'un quota fournisseur externe ne supprime
# jamais la sauvegarde quotidienne des données Roadmap 2.
mv "$WORK/database.sql.gz" "$DB_FINAL"

if ! node "$ROOT/ops/backup-storage.mjs" "$WORK/storage" "$APP_CONTAINER"; then
  printf '%s\n' "$(date '+%F %T') PARTIAL: base sauvegardee; stockage distant indisponible" > "$STATUS_FINAL"
  echo "$(date '+%F %T') backup PARTIAL: $(basename "$DB_FINAL") conserve; stockage distant en echec — intervention fournisseur requise"
  exit 1
fi
if ! node "$ROOT/ops/backup-storage.mjs" --verify "$WORK/storage"; then
  printf '%s\n' "$(date '+%F %T') PARTIAL: base sauvegardee; verification stockage en echec" > "$STATUS_FINAL"
  echo "$(date '+%F %T') backup PARTIAL: $(basename "$DB_FINAL") conserve; verification stockage en echec"
  exit 1
fi
tar -czf "$WORK/storage.tar.gz" -C "$WORK/storage" .
tar -tzf "$WORK/storage.tar.gz" >/dev/null
[ "$(wc -c < "$WORK/storage.tar.gz")" -ge 1000 ] || { echo "backup FAILED: archive stockage anormalement petite"; exit 1; }

mv "$WORK/storage.tar.gz" "$STORAGE_FINAL"
rm -f "$STATUS_FINAL"
COMPLETE=1

find "$DIR" -name 'rebondpro-*.sql.gz' -mtime +7 -delete
find "$DIR" -name 'rebondpro-storage-*.tar.gz' -mtime +7 -delete
find "$DIR" -name 'rebondpro-*.status' -mtime +30 -delete

echo "$(date '+%F %T') backup OK: $(basename "$DB_FINAL") ($(du -h "$DB_FINAL" | cut -f1)), $(basename "$STORAGE_FINAL") ($(du -h "$STORAGE_FINAL" | cut -f1))"
