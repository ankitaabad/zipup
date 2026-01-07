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
    config.headers["X-CSRF-Token"] = csrf;
  }

  return config;
});

/* ---------------- REFRESH ---------------- */

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Network / CORS / timeout errors
    if (!error.response) {
      return Promise.reject(error);
    }

    // Only handle 401
    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do not refresh on auth routes
    const url = originalRequest.url ?? "";
    if (
      url.includes("/admin/login") ||
      url.includes("/admin/refresh")
    ) {
      return Promise.reject(error);
    }

    // Prevent infinite loop
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await api.post("/admin/refresh");
      return api.request(originalRequest);
    } catch {
      window.location.href = "/login";
      return Promise.reject(error);
    }
  }
);

