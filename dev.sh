#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
#  Cronotix — Script de gestión de desarrollo
#  Uso:  ./dev.sh [comando]
#
#  Comandos:
#    start    Inicia frontend + backend (default)
#    stop     Para todos los procesos
#    restart  Reinicia todos los procesos
#    status   Estado de los procesos
#    logs     Logs en tiempo real (Ctrl+C para salir)
#    logs:be  Logs solo del backend
#    logs:fe  Logs solo del frontend
#    monit    Monitor interactivo (CPU / RAM)
#    urls     Muestra las URLs activas
# ─────────────────────────────────────────────────────
set -e

CMD="${1:-start}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

case "$CMD" in
  start)
    echo "▶ Iniciando Cronotix con PM2…"
    cd "$SCRIPT_DIR"
    pm2 start ecosystem.config.cjs
    sleep 3
    pm2 status
    echo ""
    echo "  Frontend → $(pm2 logs cronotix-frontend --lines 30 --nostream 2>/dev/null | grep 'Local:' | tail -1 | awk '{print $NF}')"
    echo "  Backend  → http://localhost:3000"
    echo "  Swagger  → http://localhost:3000/api/docs"
    ;;
  stop)
    echo "▶ Parando todos los procesos…"
    pm2 stop all
    pm2 status
    ;;
  restart)
    echo "▶ Reiniciando todos los procesos…"
    cd "$SCRIPT_DIR"
    pm2 restart all
    sleep 2
    pm2 status
    ;;
  status)
    pm2 status
    ;;
  logs)
    pm2 logs
    ;;
  logs:be)
    pm2 logs cronotix-backend
    ;;
  logs:fe)
    pm2 logs cronotix-frontend
    ;;
  monit)
    pm2 monit
    ;;
  urls)
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Backend  → http://localhost:3000"
    echo "  Swagger  → http://localhost:3000/api/docs"
    FE_PORT=$(pm2 logs cronotix-frontend --lines 50 --nostream 2>/dev/null \
      | grep 'Local:' | tail -1 | grep -oP ':\K[0-9]+')
    if [ -n "$FE_PORT" ]; then
      echo "  Frontend → http://localhost:${FE_PORT}"
    else
      echo "  Frontend → (revisa: pm2 logs cronotix-frontend)"
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ;;
  *)
    echo "Comando desconocido: $CMD"
    echo "Uso: ./dev.sh [start|stop|restart|status|logs|logs:be|logs:fe|monit|urls]"
    exit 1
    ;;
esac
