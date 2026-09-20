#!/usr/bin/env bash
#
# Prepares a fresh instance to run the server: installs Node, npm and rsync,
# then installs the systemd unit pointed at the user and directory this host
# actually deploys as.
#
# Run once per instance, before the first deploy. The service is left enabled
# but not started — there is nothing to start until an upload has happened,
# and deploy.sh's own `systemctl restart` starts it.
#
# Usage:
#   deploy/setup.sh ubuntu@<elastic-ip>
#   deploy/setup.sh <ssh-config-host>
#   BIGTWO_REMOTE_DIR=/srv/bigtwo deploy/setup.sh ubuntu@<elastic-ip>

set -euo pipefail

HOST=${1:-${BIGTWO_HOST:-}}
# Must match the deploy's directory, so both default the same way.
REMOTE_DIR=${BIGTWO_REMOTE_DIR:-bigtwo}
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)

if [[ -z $HOST ]]; then
  echo "usage: $0 <user@host>   (or set BIGTWO_HOST)" >&2
  exit 1
fi

echo "==> installing node, npm and rsync on $HOST"
# The final check is the point of this step: npm has to be found by a
# non-interactive shell, which is all deploy.sh and systemd ever get. An nvm
# install satisfies `npm --version` at a login prompt and still fails both.
ssh "$HOST" 'set -eu
if command -v dnf >/dev/null; then
  sudo dnf install -y nodejs npm rsync
elif command -v apt-get >/dev/null; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm rsync
else
  echo "neither dnf nor apt-get here — install nodejs, npm and rsync by hand" >&2
  exit 1
fi
command -v npm >/dev/null || {
  echo "npm is not on a non-interactive PATH after installing" >&2
  exit 1
}'

remote=$(ssh "$HOST" 'id -un; pwd')
REMOTE_USER=$(sed -n 1p <<<"$remote")
REMOTE_HOME=$(sed -n 2p <<<"$remote")
case $REMOTE_DIR in
  /*) REMOTE_PATH=$REMOTE_DIR ;;
  *) REMOTE_PATH=$REMOTE_HOME/$REMOTE_DIR ;;
esac

echo "==> installing the service, running as $REMOTE_USER from $REMOTE_PATH"
# Piped into `sudo tee` because the destination is root-owned, which a plain
# scp as the login user cannot write.
sed -e "s|^User=.*|User=$REMOTE_USER|" \
    -e "s|/home/ec2-user/bigtwo|$REMOTE_PATH|g" \
    "$REPO_ROOT/deploy/bigtwo.service" |
  ssh "$HOST" 'sudo tee /etc/systemd/system/bigtwo.service >/dev/null'

ssh "$HOST" 'sudo systemctl daemon-reload && sudo systemctl enable bigtwo'

echo "==> done — deploy with: deploy/deploy.sh $HOST"
