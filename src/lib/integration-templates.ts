import type { IntegrationFieldType } from "@/types/config";

export interface IntegrationTemplate {
  id: string;
  name: string;
  icon: string;
  endpoint: string;
  headers?: Record<string, string>;
  fields: Array<{ path: string; label: string; type: IntegrationFieldType }>;
  display: "inline" | "badge" | "card";
}

export const INTEGRATION_TEMPLATES: IntegrationTemplate[] = [
  {
    id: "pihole",
    name: "Pi-hole",
    icon: "🛡️",
    endpoint: "http://${HOST}/admin/api.php",
    fields: [
      { path: "ads_percentage_today", label: "Ads Blocked", type: "percent" },
      { path: "domains_being_blocked", label: "Domains", type: "number" },
      { path: "dns_queries_today", label: "Queries", type: "number" },
    ],
    display: "card",
  },
  {
    id: "sonarr",
    name: "Sonarr",
    icon: "📺",
    endpoint: "http://${HOST}:8989/api/v3/series?apiKey=${SONARR_API_KEY}",
    fields: [
      { path: "length", label: "Series", type: "number" },
    ],
    display: "badge",
  },
  {
    id: "radarr",
    name: "Radarr",
    icon: "🎬",
    endpoint: "http://${HOST}:7878/api/v3/movie?apiKey=${RADARR_API_KEY}",
    fields: [
      { path: "length", label: "Movies", type: "number" },
    ],
    display: "badge",
  },
  {
    id: "plex",
    name: "Plex",
    icon: "🎥",
    endpoint: "http://${HOST}:32400/status/sessions?X-Plex-Token=${PLEX_TOKEN}",
    headers: { "Accept": "application/json" },
    fields: [
      { path: "MediaContainer.size", label: "Active Streams", type: "number" },
    ],
    display: "badge",
  },
  {
    id: "jellyfin",
    name: "Jellyfin",
    icon: "🎭",
    endpoint: "http://${HOST}:8096/Sessions?ActiveWithinMinutes=20",
    headers: { "X-Emby-Token": "${JELLYFIN_API_KEY}" },
    fields: [
      { path: "length", label: "Active Sessions", type: "number" },
    ],
    display: "badge",
  },
  {
    id: "portainer",
    name: "Portainer",
    icon: "🐳",
    endpoint: "https://${HOST}/api/endpoints",
    headers: { "X-API-Key": "${PORTAINER_API_KEY}" },
    fields: [
      { path: "[0].Snapshots[0].RunningContainerCount", label: "Running", type: "number" },
      { path: "[0].Snapshots[0].StoppedContainerCount", label: "Stopped", type: "number" },
      { path: "[0].Snapshots[0].ImageCount", label: "Images", type: "number" },
      { path: "[0].Snapshots[0].VolumeCount", label: "Volumes", type: "number" },
      { path: "[0].Snapshots[0].StackCount", label: "Stacks", type: "number" },
      { path: "[0].Snapshots[0].TotalCPU", label: "CPUs", type: "number" },
      { path: "[0].Snapshots[0].TotalMemory", label: "Memory", type: "bytes" },
    ],
    display: "card",
  },
  {
    id: "proxmox",
    name: "Proxmox",
    icon: "🖥️",
    endpoint: "https://${HOST}:8006/api2/json/nodes/localhost/status",
    headers: { "Cookie": "PVEAuthCookie=${PROXMOX_TOKEN}" },
    fields: [
      { path: "data.cpu", label: "CPU", type: "percent" },
      { path: "data.memory.used", label: "Memory", type: "bytes" },
      { path: "data.memory.total", label: "Total RAM", type: "bytes" },
    ],
    display: "card",
  },
  {
    id: "qbittorrent",
    name: "qBittorrent",
    icon: "🔽",
    endpoint: "http://${HOST}:8080/api/v2/transfer/info",
    headers: { "Cookie": "SID=${QBITTORRENT_SID}" },
    fields: [
      { path: "dl_info_speed", label: "Download", type: "bitrate" },
      { path: "up_info_speed", label: "Upload", type: "bitrate" },
    ],
    display: "card",
  },
  {
    id: "traefik",
    name: "Traefik",
    icon: "🚦",
    endpoint: "http://${HOST}:8080/api/overview",
    fields: [
      { path: "http.routers.total", label: "Routers", type: "number" },
      { path: "http.services.total", label: "Services", type: "number" },
    ],
    display: "card",
  },
  {
    id: "unraid",
    name: "Unraid",
    icon: "💾",
    endpoint: "http://${HOST}/plugins/dynamix/include/Disks.php",
    headers: { "Authorization": "Bearer ${UNRAID_API_KEY}" },
    fields: [
      { path: "0.freespace", label: "Free Space", type: "bytes" },
    ],
    display: "card",
  },
];
