import { notifications } from "@mantine/notifications";
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true
});

// ---------------- CSRF ----------------
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

// show success message

api.interceptors.response.use((res) => {
  if (res.status === 200) {
    if (res.data.message) {
      notifications.show({
        position: "top-center",

        title: "Success",
        message: res.data.message,
        color: "green"
      });
    }
  }
  return res;
});

// ---------------- REFRESH ----------------
api.interceptors.response.use(
  (res) => res, // return response if ok
  async (error) => {
    const originalRequest = error.config;

    // Network / CORS / timeout
    if (!error.response) {
      notifications.show({
        position: "top-center",

        title: "Network Error",
        message: "Please check your connection",
        color: "red"
      });
      return Promise.reject(error);
    }

    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) {
      const url = originalRequest.url ?? "";
      if (!url.includes("/admin/login") && !url.includes("/admin/refresh")) {
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await api.post("/admin/refresh");
            return api.request(originalRequest);
          } catch {
            // window.location.href = "/login";
            return Promise.reject(error);
          }
        }
      }
    }
    if (status === 401) {
      // don't show error if it's just an auth issue, handled by AuthGuard
      return Promise.reject(error);
    }
    // Show Mantine notification for all API errors
    if (data?.error) {
      const errorPayload = data.error;
      notifications.show({
        position: "top-center",

        title: `Error ${status} – ${errorPayload.code}`,
        message: errorPayload.message,
        color: "red"
      });

      // Optional: show field-level validation details
      if (errorPayload.details && typeof errorPayload.details === "object") {
        Object.entries(errorPayload.details).forEach(([field, msg]) => {
          notifications.show({
            position: "top-center",

            title: `Field: ${field}`,
            message: msg as string,
            color: "red"
          });
        });
      }
    } else {
      // fallback if data.error missing
      notifications.show({
        position: "top-center",

        title: `Error ${status}`,
        message: error.message,
        color: "red"
      });
    }

    return Promise.reject(error);
  }
);
