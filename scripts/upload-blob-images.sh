#!/usr/bin/env bash
set -euo pipefail

# Uploads one or more local images to Vercel Blob under images/<filename>,
# with a 1-year cache-control-max-age set from the start.
#
# Usage:
#   ./scripts/upload-blob-images.sh path/to/photo1.jpg path/to/photo2.png
#
# Requires: vercel CLI logged in and this project linked (see `vercel login`).

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <file1> [file2 ...]" >&2
  exit 1
fi

MAX_AGE=31536000

for local_file in "$@"; do
  if [ ! -f "$local_file" ]; then
    echo "Skipping $local_file: not a file" >&2
    continue
  fi

  filename=$(basename "$local_file")
  pathname="images/$filename"

  echo "==> uploading $local_file -> $pathname"
  vercel blob put "$local_file" \
    --pathname "$pathname" \
    --access public \
    --cache-control-max-age "$MAX_AGE"
done

echo "Done."
