#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
TMP_ROOT=$(mktemp -d)
MOCK_BIN="$TMP_ROOT/bin"
mkdir -p "$MOCK_BIN"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT INT TERM

cat > "$MOCK_BIN/docker" <<'EOF'
#!/bin/sh
head -c 12000 /dev/urandom
EOF

cat > "$MOCK_BIN/node" <<'EOF'
#!/bin/sh
mode=${2:-}
output=$2
if [ "${BACKUP_STORAGE_FAIL:-0}" = "1" ] && [ "$mode" != "--verify" ]; then
  exit 42
fi
if [ "$mode" != "--verify" ]; then
  mkdir -p "$output"
  head -c 2048 /dev/urandom > "$output/object.bin"
fi
EOF
chmod +x "$MOCK_BIN/docker" "$MOCK_BIN/node"

SUCCESS_DIR="$TMP_ROOT/success"
PATH="$MOCK_BIN:$PATH" REBONDPRO_ROOT="$ROOT" REBONDPRO_BACKUP_DIR="$SUCCESS_DIR" sh "$ROOT/ops/backup.sh"
find "$SUCCESS_DIR" -name 'rebondpro-*.sql.gz' -type f | grep -q .
find "$SUCCESS_DIR" -name 'rebondpro-storage-*.tar.gz' -type f | grep -q .
if find "$SUCCESS_DIR" -name 'rebondpro-*.status' -type f | grep -q .; then
  echo "backup smoke FAILED: marqueur PARTIAL présent après succès"
  exit 1
fi

FAILURE_DIR="$TMP_ROOT/failure"
if PATH="$MOCK_BIN:$PATH" BACKUP_STORAGE_FAIL=1 REBONDPRO_ROOT="$ROOT" REBONDPRO_BACKUP_DIR="$FAILURE_DIR" sh "$ROOT/ops/backup.sh"; then
  echo "backup smoke FAILED: la panne stockage devait retourner un code non nul"
  exit 1
fi
find "$FAILURE_DIR" -name 'rebondpro-*.sql.gz' -type f | grep -q .
find "$FAILURE_DIR" -name 'rebondpro-*.status' -type f -exec grep -q 'PARTIAL' {} \;
if find "$FAILURE_DIR" -name 'rebondpro-storage-*.tar.gz' -type f | grep -q .; then
  echo "backup smoke FAILED: archive stockage publiée malgré la panne"
  exit 1
fi

printf '%s\n' '{"status":"pass","suite":"backup_partial_preservation"}'
