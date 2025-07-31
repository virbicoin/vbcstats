// Shared types for the application

export interface NodeStats {
  active?: boolean;
  mining?: boolean;
  hashrate?: number;
  peers?: number;
  pending?: number;
  gasPrice?: number;
  uptime?: number;
  latency?: number;
  block?: {
    number?: number;
    hash?: string;
    totalDifficulty?: number;
    timestamp?: number;
    time?: number;
    received?: number;
    propagation?: number;
    transactions?: unknown[];
    uncles?: unknown[];
    [key: string]: unknown;
  };
  propagationAvg?: number;
  [key: string]: unknown;
}

export interface Node {
  id: string | number;
  name: string;
  type?: string;
  info?: {
    name?: string;
    type?: string;
    ip?: string;
    node?: string;
    net?: string;
    protocol?: string;
    api?: string;
    port?: string;
    os?: string;
    os_v?: string;
    client?: string;
    [key: string]: unknown;
  };
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    ll?: [number, number];
    [key: string]: unknown;
  } | null;
  stats?: NodeStats;
  latency?: string | number | { id: string; latency: string };
  mining?: boolean;
  peers?: number;
  pending?: number;
  block?: number;
  blockHash?: string;
  totalDifficulty?: number;
  transactions?: number;
  uncles?: number;
  lastBlockTime?: string | number;
  propagation?: string | number;
  propagationAvg?: string | number;
  uptime?: { lastStatus?: number; up?: number; down?: number };
  pinned?: boolean;
  latitude?: number;
  longitude?: number;
  blockTimestamp?: number;
  readable?: {
    latencyClass?: string;
    latency?: string;
  };
}

export interface StatsValue {
  value: number | string | { lastStatus?: number; up?: number; down?: number };
  unit?: string;
}

export interface StatsData { 
  [id: string]: StatsValue;
}
