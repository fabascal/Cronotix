#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
#  Cronotix — Configura PM2 para arrancar al iniciar
#  el servidor (auto-start on boot via systemd).
#
#  Ejecutar UNA VEZ con:  bash pm2-setup-autostart.sh
# ─────────────────────────────────────────────────────
set -e

NODE_BIN="$(dirname "$(which node)")"

echo "▶ Registrando PM2 como servicio systemd..."
sudo env PATH="$PATH:$NODE_BIN" \
  "$(which pm2)" startup systemd -u "$USER" --hp "$HOME"

echo ""
echo "▶ Guardando lista de procesos actuales..."
pm2 save

echo ""
echo "✅ Listo. PM2 iniciará automáticamente con el servidor."
echo "   Puedes verificar con:  systemctl status pm2-$USER"
