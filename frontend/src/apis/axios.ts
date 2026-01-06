import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

/* ---------------- CSRF ---------------- */

api.interceptors.request.use((config) => {
  const csrf = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="))
    ?.split("=")[1];

  if (csrf) {
    config.headers["x-csrf-token"] = csrf;
  }

  return config;
});

/* ---------------- REFRESH ---------------- */

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // ❗ no response → network error
    if (!error.response) {
      return Promise.reject(error);
    }

    // ❗ already retried once
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ❗ do NOT refresh on these routes
    const isAuthRoute =
      originalRequest.url?.includes("/admin/login") ||
      originalRequest.url?.includes("/admin/refresh");

    if (error.response.status === 401 && !isAuthRoute) {
      originalRequest._retry = true;

      try {
        await api.post("/admin/refresh");
        return api.request(originalRequest);
      } catch {
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
