#!/usr/bin/env bash
#
# Builds the client locally and deploys it to the EC2 instance, so the box
# never runs Vite and never needs the memory a build wants.
#
# What is uploaded: the built client, the server and rules sources, and the
# manifests `npm ci` needs. Not node_modules (platform-specific) and not
# .data (the server's snapshot lives only on the box).
#
# Usage:
#   deploy/deploy.sh ubuntu@<elastic-ip>
#   deploy/deploy.sh <ssh-config-host>
#   BIGTWO_REMOTE_DIR=/srv/bigtwo deploy/deploy.sh ubuntu@<elastic-ip>

set -euo pipefail

HOST=${1:-${BIGTWO_HOST:-}}
# Relative, so it lands in the SSH user's home whatever that user is called —
# rsync creates this directory but would not create a missing parent above it.
REMOTE_DIR=${BIGTWO_REMOTE_DIR:-bigtwo}
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)

if [[ -z $HOST ]]; then
  echo "usage: $0 <user@host>   (or set BIGTWO_HOST)" >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "==> building client"
npm run build

if [[ ! -f client/dist/index.html ]]; then
  echo "build produced no client/dist/index.html — aborting" >&2
  exit 1
fi

echo "==> uploading to $HOST:$REMOTE_DIR"
# Excludes come first: an excluded path is also protected from --delete, which
# is what keeps the server's .data snapshot from being wiped on every deploy.
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.data' \
  --include='/package.json' \
  --include='/package-lock.json' \
  --include='/rules/***' \
  --include='/server/***' \
  --include='/client/' \
  --include='/client/package.json' \
  --include='/client/dist/***' \
  --include='/deploy/***' \
  --exclude='*' \
  ./ "$HOST:$REMOTE_DIR/"

echo "==> installing runtime dependencies and restarting"
ssh "$HOST" "cd '$REMOTE_DIR' && npm ci --omit=dev && sudo systemctl restart bigtwo"

echo "==> done"
