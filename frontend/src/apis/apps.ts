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

export function useAppKey(appId: string) {
  return useQuery({
    queryKey: ["apps", appId, "app-key"],
    queryFn: async () => {
      const res = await api.get<{ app_key: string; secret_key: string }>(
        `/apps/${appId}/app-key`
      );
      return res.data;
    },
    enabled: !!appId
  });
}

export function useAppStatus(appId: string) {
  return useQuery({
    queryKey: ["apps", appId, "status"],
    queryFn: async () => {
      const res = await api.get<{ status: string }>(`/apps/${appId}/status`);
      return res.data.status;
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

export function useRotateKeys(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post(`/apps/${appId}/rotate-keys`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    }
  });
}

export function useUpdateApp(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload:
        | { action: "UpdateDomain"; domain: string }
        | { action: "UpdateStartCommand"; start_command: string }
        | { action: "UpdateAppName"; name: string }
        | { action: "UpdateRedisPrefix"; redis_prefix: string }
    ) => {
      const res = await api.patch(`/apps/${appId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    }
  });
}

// delete app
export function useDeleteApp(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/apps/${appId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    }
  });
}

// start app
export function useStartApp(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post(`/apps/${appId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    }
  });
}

//stop app
export function useStopApp(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post(`/apps/${appId}/stop`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apps", appId] });
    }
  });
}

