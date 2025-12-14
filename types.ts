export interface NodeItem {
  id: string;
  protocol: 'vmess' | 'vless' | 'ss' | 'trojan' | 'unknown';
  name: string;
  address: string;
  port: number;
  uuid?: string;
  latency?: number; // ms
  country?: string;
  status: 'active' | 'timeout' | 'untested';
  rawLink: string;
}

export interface AppSettings {
  email: string;
  emailProvider: 'smtp' | 'mailgun' | 'telegram';
  apiKey: string; // Generic field for API key (Mailgun/Telegram)
  cronSchedule: string;
  sources: string[];
  workerUrl?: string; // New: Deployed Worker URL for remote testing
}

export interface ScanLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  NODES = 'NODES',
  SETTINGS = 'SETTINGS',
}