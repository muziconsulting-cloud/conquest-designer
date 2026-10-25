#!/bin/bash
set -euo pipefail

# Deploy the Conquest venue to the WardByWard box.
#
# Additive by construction. This script NEVER edits an existing deployment
# configuration:
#   · /etc/nginx/sites-available/wardbyward      — read-only reference; hash-guarded
#   · /home/wardair/thegearmerchant/**           — read-only reference; never touched
#   · /home/wardair/thegearmerchant/ecosystem.config.cjs — never touched
# Conquest gets its own site file (conquestdesigner.com), its own PM2 app, its own dir, port 3500.
#
# The reference hashes below are checked before AND after, so a bad deploy aborts
# instead of silently damaging the working WardByWard setup.
#
#   ./deploy/deploy-conquest.sh              # ship + reload + origin health
#   ./deploy/deploy-conquest.sh --nginx      # also install the domain site file
#   ./deploy/deploy-conquest.sh --rollback   # remove only the Conquest site file
#   ./deploy/deploy-conquest.sh --dry-run    # typecheck only

cd "$(dirname "$0")/.."
HOST="wardbyward"
APP_DIR="/home/ubuntu/conquest"
DOMAIN="conquestdesigner.com"
SITE_NAME="conquestdesigner"
WARD_SITE="/etc/nginx/sites-available/wardbyward"
WARD_HASH="051281bb0ddfed7c4b87f1aca1748ad569cfc59ebdedd5057d272d6206acf339"
WARD_ECO="/home/wardair/thegearmerchant/ecosystem.config.cjs"
WARD_ECO_HASH="8c6926941e9e4b2f7974299f20a9cda8ba730164654037edb15dbfbf1a24413e"

DRY=0
INSTALL_NGINX=0
ROLLBACK=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --nginx) INSTALL_NGINX=1 ;;
    --rollback) ROLLBACK=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

guard_reference () {
  ssh "$HOST" "set -e
    a=\$(sudo -n sha256sum $WARD_SITE | cut -d' ' -f1)
    b=\$(sudo -n sha256sum $WARD_ECO | cut -d' ' -f1)
    [ \"\$a\" = \"$WARD_HASH\" ] || { echo \"ABORT: $WARD_SITE changed (\$a)\" >&2; exit 1; }
    [ \"\$b\" = \"$WARD_ECO_HASH\" ] || { echo \"ABORT: $WARD_ECO changed (\$b)\" >&2; exit 1; }
    echo 'reference intact: wardbyward nginx + gearmerchant ecosystem unchanged'"
}

if [ "$ROLLBACK" = "1" ]; then
  echo "=== rollback: removing only the Conquest site file ==="
  ssh "$HOST" "sudo -n rm -f /etc/nginx/sites-enabled/$SITE_NAME /etc/nginx/sites-available/$SITE_NAME
    sudo -n nginx -t && sudo -n nginx -s reload
    pm2 delete conquest-venue >/dev/null 2>&1 || true"
  guard_reference
  echo "rolled back; WardByWard untouched"
  exit 0
fi

echo "=== 0/5 Reference guard ==="
guard_reference

echo "=== 1/5 Preflight (typecheck) ==="
bunx tsc --noEmit

if [ "$DRY" = "1" ]; then
  echo "=== dry-run: typecheck only, nothing shipped ==="
  exit 0
fi

echo "=== 2/5 Shipping code to $HOST:$APP_DIR ==="
rsync -az --delete \
  --exclude node_modules --exclude vendor --exclude .git \
  --exclude .env --exclude '*.Zone.Identifier' \
  ./ "$HOST:$APP_DIR/"

echo "=== 3/5 Reloading conquest-venue under PM2 ==="
# --update-env applies to conquest only; pm2 save rewrites the dump additively
# (existing processes stay listed and untouched).
ssh "$HOST" "cd $APP_DIR && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save"

echo "=== 4/5 Waiting for origin health ==="
OK=0
for _ in $(seq 1 30); do
  if ssh "$HOST" 'curl -fsS -m 3 http://127.0.0.1:3500/health' >/dev/null 2>&1; then OK=1; break; fi
  sleep 2
done
[ "$OK" = "1" ] || { echo "ERROR: origin unhealthy; run: pm2 logs conquest-venue" >&2; exit 1; }

if [ "$INSTALL_NGINX" = "1" ]; then
  echo "=== 5/5 Installing $DOMAIN as its own site file (additive) ==="
  rsync -az "deploy/nginx/$SITE_NAME.conf" "$HOST:/tmp/$SITE_NAME.conf"
  ssh "$HOST" "sudo -n install -m 0644 -o root -g root /tmp/$SITE_NAME.conf /etc/nginx/sites-available/$SITE_NAME
    sudo -n ln -sfn /etc/nginx/sites-available/$SITE_NAME /etc/nginx/sites-enabled/$SITE_NAME
    rm -f /tmp/$SITE_NAME.conf
    sudo -n nginx -t && sudo -n nginx -s reload"
else
  echo "=== 5/5 nginx untouched (pass --nginx on first deploy) ==="
fi

echo "=== Verifying through nginx (SNI + Host; no DNS needed) ==="
ssh "$HOST" "curl -kfsS -m 5 --resolve $DOMAIN:443:127.0.0.1 https://$DOMAIN/health" || {
  echo "WARN: domain not serving yet (site file absent or ports closed)" >&2
}

echo "=== Post-deploy reference guard ==="
guard_reference

echo "=== Done: http://127.0.0.1:3500 (origin) / https://$DOMAIN (edge) ==="
