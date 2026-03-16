// src/apis/envVar.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios"; // your axios instance
export interface SecretVar {
  id: string;
  key: string;
  description: string;
}
export function useGetAllSecretVarsKeys(appId: string) {
  return useQuery({
    queryKey: ["secret-vars-keys", appId],
    queryFn: async () => {
      const res = await api.get<{ data: SecretVar[] }>(
        `/apps/${appId}/secrets/keys`
      );
      return res.data.data;
    },
    enabled: !!appId
  });
}

export function useFetchSecretVar(appId: string) {
  return useMutation({
    mutationFn: async (secret_id: string) => {
      const res = await api.get<{
        data: { key: string; value: string; description: string };
      }>(`/apps/${appId}/secrets/${secret_id}`);
      return res.data.data;
    }
  });
}

/* ---------------- Mutations ---------------- */

export function useCreateSecretVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      key: string;
      value: string;
      description: string;
    }) => {
      const res = await api.post(`/apps/${appId}/secrets`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secret-vars-keys", appId] });
    }
  });
}
// also invalidate the query for single secret value
export function useDeleteSecretVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (secret_id: string) => {
      const res = await api.delete(`/apps/${appId}/secrets/${secret_id}`);
      return res.data;
    },
    onSuccess: (_, secret_id) => {
      queryClient.invalidateQueries({ queryKey: ["secret-vars-keys", appId] });
    }
  });
}

export function useUpdateSecretVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      secret_id: string;
      value: string;
      description: string;
    }) => {
      const res = await api.put(`/apps/${appId}/secrets/${data.secret_id}`, {
        value: data.value,
        description: data.description
      });
      return res.data;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ["secret-vars-keys", appId] });
    }
  });
}
