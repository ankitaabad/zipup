import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios";

/* =========================
   Types
========================= */

export type AdminLoginPayload = {
  username: string;
  password: string;
};

export type AdminChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

/* =========================
   Queries
========================= */

/**
 * Verify admin session (cookie-based)
 * Used on admin app boot / route guard
 */
export function useAdminVerifySession() {
  return useQuery({
    queryKey: ["admin", "auth", "verify"],
    queryFn: async () => {
      const res = await api.get<{ message: string }>("/admin/verify");
      return res.data;
    },
    retry: false,
    staleTime: 60_000
  });
}

/* =========================
   Mutations
========================= */

/**
 * Admin login
 * Cookies are set by server
 */
export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminLoginPayload) => {
      const res = await api.post("/admin/login", payload);
      return res.data;
    },
    onSuccess: () => {
      // todo: should we invalidate everything here.
      queryClient.invalidateQueries();
    }
  });
}

/**
 * Admin logout
 */
export function useAdminLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/admin/logout");
      return res.data;
    }
    // onSuccess: () => {
    // },
  });
}

/**
 * Refresh admin access token
 * Usually called by axios interceptor
 */
export function useAdminRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post("/admin/refresh");
      return res.data;
    }
  });
}

/**
 * Change admin password
 */
export function useAdminChangePassword() {
  return useMutation({
    mutationFn: async (payload: AdminChangePasswordPayload) => {
      const res = await api.post("/admin/change-password", payload);
      return res.data;
    }
  });
}

// change password
export function useChangeAdminPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { new_password: string }) => {
      await api.post(`/admin/change-password`, payload);
    }
    // onSuccess: () => {
    //   queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    // }
  });
}

export function useAdminMe() {
  // should not cache at all
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const res = await api.get("/admin/me");
      return res.data;
    },
    retry: false,
  });
}
