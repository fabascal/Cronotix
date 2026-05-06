/**
 * PM2 Ecosystem — Cronotix
 *
 * Comandos útiles:
 *   pm2 start ecosystem.config.cjs   # Iniciar todo
 *   pm2 stop all                     # Parar todo
 *   pm2 restart all                  # Reiniciar todo
 *   pm2 reload all                   # Zero-downtime reload
 *   pm2 logs                         # Ver logs en tiempo real
 *   pm2 logs cronotix-backend        # Logs solo del backend
 *   pm2 logs cronotix-frontend       # Logs solo del frontend
 *   pm2 status                       # Estado de los procesos
 *   pm2 monit                        # Monitor interactivo (CPU/RAM)
 *   pm2 save                         # Guardar lista de procesos
 *   pm2 startup                      # Auto-start al reiniciar el servidor
 */

module.exports = {
  apps: [
    /* ── Backend: NestJS (dev con hot-reload) ── */
    {
      name: "cronotix-backend",
      cwd: "./backend",
      script: "npm",
      args: "run start:dev",
      interpreter: "none",
      watch: false,           // NestJS ya tiene su propio watcher (--watch)
      env: {
        NODE_ENV: "development",
      },
      /* Reintentar si falla, con back-off */
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "5s",
      /* Logs */
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      /* Evitar que PM2 duplique colores en los logs */
      force_color: false,
    },

    /* ── Frontend: Vite dev server ── */
    {
      name: "cronotix-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      interpreter: "none",
      watch: false,           // Vite ya tiene su propio HMR watcher
      env: {
        NODE_ENV: "development",
        NODE_DISABLE_COMPILE_CACHE: "1",
      },
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: "5s",
      /* Logs */
      out_file: "./logs/frontend-out.log",
      error_file: "./logs/frontend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      force_color: false,
    },
  ],
};
