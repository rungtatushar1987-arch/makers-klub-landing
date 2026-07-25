#!/usr/bin/env bash
set -euo pipefail

# Re-uploads each blob in place with cache-control-max-age set to 1 year (31536000s).
# Requires: vercel CLI logged in and linked to this project (`vercel link`).

MAX_AGE=31536000
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

IMAGES=(
  "images/DSC05041.jpg"
  "images/DSC05060.jpg"
  "images/DSC05066.jpg"
  "images/DSC05077.jpg"
  "images/DSC05080.jpg"
  "images/DSC05088.jpg"
  "images/DSC05098.jpg"
  "images/DSC05104.jpg"
  "images/DSC05121.jpg"
  "images/DSC05123.jpg"
  "images/DSC05126.jpg"
  "images/DSC05133.jpg"
  "images/pl-scr-1.png"
  "images/pl-scr-4.png"
)

for pathname in "${IMAGES[@]}"; do
  local_file="$TMP_DIR/$(basename "$pathname")"
  echo "==> $pathname"
  vercel blob get "$pathname" --access public --output "$local_file"
  vercel blob put "$local_file" \
    --pathname "$pathname" \
    --access public \
    --allow-overwrite \
    --cache-control-max-age "$MAX_AGE"
done

echo "Done. All ${#IMAGES[@]} blobs updated to max-age=$MAX_AGE (1 year)."
