import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios";

/* ---------------- Types ---------------- */

export interface Setting {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface SettingsResponse {
  data: Setting[];
}

/* ---------------- Queries ---------------- */

export function useGetSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get<SettingsResponse>("/settings");
      return res.data.data;
    }
  });
}

/* ---------------- Mutations ---------------- */

export function useUpdateCertEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await api.put("/settings/cert-email", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { domain: string }) => {
      const res = await api.put("/settings/domain", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    }
  });
}
