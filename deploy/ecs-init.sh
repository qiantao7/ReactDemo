#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="${3:-/opt/reactdemo}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "usage: bash deploy/ecs-init.sh <domain> <email> [app_dir]"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "app repo not found at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"
cp deploy/nginx.reactdemo.conf /etc/nginx/sites-available/reactdemo.conf
sed -i "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/sites-available/reactdemo.conf
ln -sf /etc/nginx/sites-available/reactdemo.conf /etc/nginx/sites-enabled/reactdemo.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

docker compose up -d --build

certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect

echo "done"
echo "https://$DOMAIN"
