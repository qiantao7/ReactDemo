#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/opt/reactdemo}"
BRANCH="${2:-main}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "app repo not found at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
docker compose up -d --build
docker compose ps
