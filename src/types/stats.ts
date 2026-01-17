export interface NetworkStats {
  bestBlock: number;
  lastBlock: number;
  avgBlockTime: number;
  gasPrice: string;
  gasLimit: number;
  nodesActive: number;
  nodesTotal: number;
  lastBlocksTime: number[];
  blockPropagationChart: BlockPropagationData[];
  transactionDensity: number[];
  gasSpending: number[];
  lastGasLimit: number[];
  miners: MinerData[];
  // Additional stats from original ethstats
  uncles: number;
  uncleCount: number[];
  avgNetworkHashrate: number;
  difficulty: number;
  difficultyChart: number[];
  pageLatency: number;
  uptime: number;
  worldMap: WorldMapNode[];
  nodeDetails: NodeDetails;
}

export interface BlockData {
  number: number;
  hash: string;
  timestamp: number;
  difficulty: number;
  totalDifficulty: number;
  gasLimit: number;
  gasUsed: number;
  uncles: string[];
  transactions: string[];
}

export interface MinerData {
  miner: string;
  name: string;
  blocks: number;
}

export interface BlockPropagationData {
  time: number;
  value: number;
  count: number;
}

export interface NodeDetails {
  name: string;
  version: string;
  latency: number;
  hashrate: number;
  peers: number;
  pending: number;
  bestBlock: number;
  bestBlockHash: string;
  totalDifficulty: number;
  lastUpdate: number;
}

export interface WorldMapNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  active: boolean;
}

export interface ChartData {
  data: number[] | BlockPropagationData[];
  type: 'sparkline' | 'histogram';
  className?: string;
}
