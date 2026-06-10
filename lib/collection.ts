export interface BlockData {
  number?: number;
  hash?: string;
  parentHash?: string;
  timestamp?: number;
  difficulty?: number | string;
  totalDifficulty?: number | string;
  totalDiff?: number | string;
  gasLimit?: number;
  gasUsed?: number;
  transactions?: unknown[];
  uncles?: unknown[];
  miner?: string;
  propagation?: number;
  received?: number;
  arrived?: number;
  time?: number;
}

export interface NodeStats {
  active?: boolean;
  mining?: boolean;
  peers?: number;
  pending?: number;
  pendingUpdatedAt?: number;
  latency?: number;
  gasPrice?: number;
  block?: BlockData;
  uptime?: number | { up?: number; down?: number; lastStatus?: number };
  propagationAvg?: number;
}

export interface NodeInfo {
  name?: string;
  type?: string;
  client?: string;
  node?: string;
  ip?: string;
}

export interface GeoData {
  range?: number[];
  country?: string;
  region?: string;
  eu?: string;
  timezone?: string;
  city?: string;
  ll?: [number, number];
  metro?: number;
  area?: number;
}

export interface NodeData {
  id: string;
  info?: NodeInfo;
  stats?: NodeStats;
  geo?: GeoData | null;
  latitude?: number;
  longitude?: number;
  uptime?: { up?: number; down?: number; lastStatus?: number };
  ip?: string;
  spark?: string;
  latency?: number;
  secret?: string;
}

type Callback<T = NodeData> = (err: Error | null, data?: T) => void;

export default class Collection {
  private nodes: Map<string, NodeData>;
  private externalPrimus: unknown;
  private chartsCallback: ((err: Error | null, data: object) => void) | null = null;

  constructor(externalPrimus: unknown) {
    this.nodes = new Map();
    this.externalPrimus = externalPrimus;
  }

  add(node: NodeData, callback?: Callback): void {
    const existing = this.nodes.get(node.id);
    if (!existing) {
      this.nodes.set(node.id, node);
      if (callback) callback(null, node);
      return;
    }

    // Node reconnected and re-sent `hello`. The hello payload carries identity/
    // info but no `stats`, so a naive overwrite would wipe the previously
    // collected runtime stats and flash the node back to block #0 until its
    // next `block` event. Merge identity here but preserve prior stats.
    const { stats: incomingStats, ...identity } = node;
    Object.assign(existing, identity);
    if (incomingStats) {
      existing.stats = { ...existing.stats, ...incomingStats };
    }
    if (callback) callback(null, existing);
  }

  update(nodeId: string, data: Partial<NodeData>, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, data);
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  all(): NodeData[] {
    return Array.from(this.nodes.values());
  }

  getNode(query: { id: string }): NodeData | undefined {
    return this.nodes.get(query.id);
  }

  inactive(nodeId: string, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      node.stats.active = false;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  addBlock(nodeId: string, blockData: BlockData, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      if (blockData.difficulty !== undefined) {
        blockData.difficulty =
          typeof blockData.difficulty === 'string'
            ? parseInt(blockData.difficulty, 10) || 0
            : blockData.difficulty;
      }
      if (blockData.totalDifficulty !== undefined) {
        blockData.totalDifficulty =
          typeof blockData.totalDifficulty === 'string'
            ? parseInt(blockData.totalDifficulty, 10) || 0
            : blockData.totalDifficulty;
      }
      if (blockData.totalDiff !== undefined) {
        blockData.totalDifficulty =
          typeof blockData.totalDiff === 'string'
            ? parseInt(blockData.totalDiff, 10) || 0
            : (blockData.totalDiff as number);
      }
      node.stats.block = blockData;
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  updatePending(nodeId: string, data: number | { pending?: number }, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      const pendingValue =
        typeof data === 'number'
          ? data
          : typeof (data as { pending?: number }).pending === 'number'
            ? (data as { pending: number }).pending
            : 0;
      node.stats.pending = pendingValue;
      node.stats.pendingUpdatedAt = Date.now();
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  updateStats(nodeId: string, data: Partial<NodeStats>, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      if (!node.stats) {
        node.stats = {};
      }
      const existingLatency = node.stats.latency;
      const existingPending = node.stats.pending;
      const existingPendingUpdatedAt = node.stats.pendingUpdatedAt;
      Object.assign(node.stats, data);
      if (data.latency === undefined && existingLatency && existingLatency > 0) {
        node.stats.latency = existingLatency;
      }
      if (data.pending === undefined) {
        if (existingPendingUpdatedAt && Date.now() - existingPendingUpdatedAt > 30000) {
          node.stats.pending = 0;
        } else if (existingPending !== undefined) {
          node.stats.pending = existingPending;
          node.stats.pendingUpdatedAt = existingPendingUpdatedAt;
        }
      } else {
        node.stats.pendingUpdatedAt = Date.now();
      }
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  addHistory(_sparkId: string, data: unknown, callback?: Callback<unknown>): void {
    if (callback) callback(null, data);
  }

  updateLatency(nodeId: string, data: number | { latency?: number }, callback?: Callback): void {
    const node = this.nodes.get(nodeId);
    if (node && node.stats) {
      const latencyValue =
        typeof data === 'number'
          ? data
          : typeof (data as { latency?: number }).latency === 'number'
            ? (data as { latency: number }).latency
            : 0;
      if (latencyValue > 0) {
        node.stats.latency = latencyValue;
      }
      if (callback) callback(null, node);
    } else {
      if (callback) callback(new Error('Node not found'));
    }
  }

  setChartsCallback(callback: (err: Error | null, data: object) => void): void {
    this.chartsCallback = callback;
    setTimeout(() => callback(null, {}), 1000);
  }

  getCharts(): void {
    if (this.chartsCallback) {
      this.chartsCallback(null, {});
    }
  }
}
