import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  /* Proxy solo para peticiones relativas a /api en dev; mismo host:puerto que el API */
  const apiUrl = env.VITE_API_URL ?? "http://192.168.210.10";
  const apiPort = env.VITE_API_PORT ?? "3000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      proxy: {
        "/api": {
          target: `${apiUrl}:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
