// TypeScript definitions for server-simple.ts
export interface NodeInfo {
  name?: string;
  node?: string;
  port?: number;
  net?: string;
  protocol?: string;
  api?: string;
  os?: string;
  os_v?: string;
  client?: string;
  canUpdateHistory?: boolean;
  type?: string;
}

export interface BlockData {
  number: number;
  hash: string;
  totalDifficulty: number;
  difficulty: number;
  gasLimit: number;
  timestamp: number;
  time: number;
  miner: string;
  size: number;
  transactions: Array<{ hash: string }>;
  uncles: string[];
  propagation?: number;
  received?: number;
}

export interface NodeStats {
  active: boolean;
  mining: boolean;
  hashrate: number;
  peers: number;
  pending: number;
  gasPrice: number;
  block?: BlockData;
  syncing: boolean;
  propagationAvg?: number;
  latency: number;
  uptime?: number;
}

export interface NodeUptime {
  up: number;
  down: number;
  lastStatus: number;
}

export interface NodeData {
  id: string;
  info?: NodeInfo;
  stats?: NodeStats;
  uptime?: NodeUptime;
  ip?: string;
  spark?: string;
  latency?: number;
}

export interface NetworkStats {
  bestBlock: { value: number };
  activeNodes: { value: number };
  avgBlockTime: { value: number };
  difficulty: { value: number };
  avgNetworkHashrate: { value: number; unit: string };
  uncles: { value: number };
  gasPrice: { value: number };
  gasLimit: { value: number };
  lastBlock: { value: number };
}

export interface BlockHistoryEntry {
  number: number;
  timestamp: number;
}

export interface ClientMessage {
  action: string;
  data: unknown;
}

export interface PrimusSpark {
  id: string;
  address: { ip: string };
  auth?: boolean;
  nodeId?: string;
  latency?: number;
  write: (data: unknown) => void;
  emit: (event: string, data?: unknown) => void;
  end: (data?: unknown, options?: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

export interface PrimusInterface {
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  plugin: (pluginName: string, plugin: unknown) => void;
  forEach: (callback: (spark: PrimusSpark) => void) => void;
  write: (data: unknown) => void;
}
