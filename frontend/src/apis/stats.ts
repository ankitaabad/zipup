// src/apis/stats.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "./axios"; // your axios instance

export interface AppStat {
  id: string;
  name: string;
  appName: string;
  appType: "user" | "system";
  instance: string;
  cpuPercent: number;
  memoryUsage: number; // bytes
  memoryLimit: number; // bytes
  memoryPercent: number;
  networkRx: number; // bytes
  networkTx: number; // bytes
}

export function useAppStats(enabled: boolean = true) {
  return useQuery({
    queryKey: ["app-stats"],
    queryFn: async (): Promise<AppStat[]> => {
      const res = await api.get<{ data: AppStat[] }>("/stats");
      return res.data.data;
    },
    refetchInterval: enabled ? 3000 : false, // poll every 3s if enabled
    staleTime: 2000,
  });
}
