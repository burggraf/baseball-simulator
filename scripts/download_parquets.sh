#!/usr/bin/env bash
# Download all Parquet files referenced in docs/parquet_catalog.md
# Usage:  ./scripts/download_parquets.sh
# Creates a local ./data directory (relative to project root) if missing and
# downloads each file if it is not already present.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p data

# Extract all unique https://... .parquet URLs
mapfile -t urls < <(grep -oE 'https://[^`]*\.parquet' docs/parquet_catalog.md | sort -u)

for url in "${urls[@]}"; do
  fname=$(basename "$url")
  out="data/$fname"
  if [[ -f "$out" ]]; then
    echo "[skip] $fname already exists"
  else
    echo "[get ] $fname"
    wget -q -O "$out" "$url"
  fi
done

echo "Finished. Parquet files saved to ./data"
