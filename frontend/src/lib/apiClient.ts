import axios from "axios";

/**
 * URL base del API (Nest). Por defecto la IP del servidor en LAN (Cronotix).
 * Sobrescribe con `.env`: `VITE_API_URL` + `VITE_API_PORT` (p. ej. http://192.168.210.10 y 3000).
 *
 * Front (Vite) suele ser :5173/:5174; backend :3000 — son procesos distintos.
 */
export const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? "http://192.168.210.10"}:${import.meta.env.VITE_API_PORT ?? "3000"}`;

const BASE_URL = API_BASE_URL;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);
