import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface EnvVar {
  id: string;
  key: string;
  value: string;
}

async function api<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Request failed");
  }

  return res.json();
}

/* -------- Queries -------- */

export function useEnvVars(appId: string) {
  return useQuery({
    queryKey: ["env-vars", appId],
    queryFn: () =>
      api<{ data: EnvVar[] }>(`/apps/${appId}/env-vars`)
        .then((r) => r.data)
  });
}

/* -------- Mutations -------- */

export function useCreateEnvVar(appId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      api(`/apps/${appId}/env-vars`, {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}

export function useUpdateEnvVar(appId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; value: string }) =>
      api(`/apps/${appId}/env-vars/${data.id}`, {
        method: "PUT",
        body: JSON.stringify({ value: data.value })
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}

export function useDeleteEnvVar(appId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api(`/apps/${appId}/env-vars/${id}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["env-vars", appId] });
    }
  });
}
