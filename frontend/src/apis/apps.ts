import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios";
import type { App, AppListItem } from "./types";

/* ---------------- Queries ---------------- */

export function useApps() {
  return useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const res = await api.get<{ data: AppListItem[] }>("/apps");
      return res.data;
    }
  });
}

export function useApp(appId: string) {
  return useQuery({
    queryKey: ["apps", appId],
    queryFn: async () => {
      const res = await api.get<{ data: AppListItem }>(`/apps/${appId}`);
      return res.data;
    },
    enabled: !!appId
  });
}

export function useAppApiKey(appId: string) {
  return useQuery({
    queryKey: ["apps", appId, "api-key"],
    queryFn: async () => {
      const res = await api.get<{ api_key: string }>(`/apps/${appId}/app-key`);
      return res.data;
    },
    enabled: !!appId
  });
}

/* ---------------- Mutations ---------------- */

export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type: string;
      // start_command: string;
      // internal_port?: number;
    }) => {
      const res = await api.post("/apps", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    }
  });
}

export function useUpdateApp(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload:
        | { action: "UpdateDomain"; domain: string; }
        | { action: "UpdateStartCommand"; start_command: string }
        | { action: "UpdateAppName"; name: string }
        | { action: "UpdateRedisPrefix"; redis_prefix: string }
    ) => {
      const res = await api.patch(`/apps/${appId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    }
  });
}
