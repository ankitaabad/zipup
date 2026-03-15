// src/apis/envVar.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios"; // your axios instance

export interface EnvVar {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

/* ---------------- Queries ---------------- */

export function useGetAllEnvVars(appId: string) {
  return useQuery({
    queryKey: ["env-vars", appId],
    queryFn: async () => {
      const res = await api.get<{ data: EnvVar[] }>(`/apps/${appId}/env-vars`);
      return res.data.data;
    },
    enabled: !!appId
  });
}

/* ---------------- Mutations ---------------- */

export function useCreateEnvVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      key: string;
      value: string;
      description?: string;
    }) => {
      console.log({ data });
      const res = await api.post(`/apps/${appId}/env-vars`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}

export function useUpdateEnvVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      value: string;
      description?: string;
    }) => {
      const res = await api.put(`/apps/${appId}/env-vars/${data.id}`, {
        value: data.value,
        description: data.description
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}

export function useDeleteEnvVar(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/apps/${appId}/env-vars/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}
