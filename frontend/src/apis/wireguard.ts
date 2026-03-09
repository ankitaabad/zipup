// src/apis/wireguard.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./axios";

/* ---------------- Types ---------------- */

export interface WireguardPeer {
  id: string;
  name: string;
  description?: string;
  status: string;
  ip_index: number;
  created_at: string;
}

export interface WireguardServer {
  id: string;
  name: string;
  public_key?: string;
  ip_index: number;
}

/* ---------------- Queries ---------------- */

export function useGetAllWireguardPeers() {
  return useQuery({
    queryKey: ["wireguard-peers"],
    queryFn: async () => {
      const res = await api.get<{ data: WireguardPeer[] }>("/wireguard/peers");
      return res.data.data;
    },
  });
}

export function useGetWireguardPeer(peerId: string) {
  return useQuery({
    queryKey: ["wireguard-peer", peerId],
    queryFn: async () => {
      const res = await api.get<{ data: WireguardPeer }>(
        `/wireguard/peers/${peerId}`
      );
      return res.data.data;
    },
    enabled: !!peerId,
  });
}

export function useGetWireguardServer() {
  return useQuery({
    queryKey: ["wireguard-server"],
    queryFn: async () => {
      const res = await api.get<{ data: WireguardServer }>(
        "/wireguard/server"
      );
      return res.data.data;
    },
  });
}

/* ---------------- Mutations ---------------- */

export function useCreateWireguardPeer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await api.post("/wireguard/peers", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wireguard-peers"] });
    },
  });
}

export function useDeleteWireguardPeer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (peerId: string) => {
      const res = await api.delete(`/wireguard/peers/${peerId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wireguard-peers"] });
    },
  });
}