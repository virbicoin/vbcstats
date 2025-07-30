"use client";
import React, { useState, useMemo } from 'react';

interface Node {
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
  latency?: string | number | { id: string; latency: string };
  mining?: boolean;
  peers?: number;
  pending?: number;
  block?: number;
  blockHash?: string;
  totalDifficulty?: number;
  transactions?: number;
  uncles?: number;
  lastBlockTime?: string;
  propagation?: string | number;
  propagationAvg?: string | number;
  uptime?: { lastStatus?: number; up?: number; down?: number };
  pinned?: boolean;
  latitude?: number;
  longitude?: number;
  blockTimestamp?: number;
  stats?: {
    active: boolean;
    mining: boolean;
    hashrate: number;
    peers: number;
    pending: number;
    gasPrice: number;
    uptime: number;
    latency: number;
    block: {
      number: number;
      hash: string;
      totalDifficulty: number;
      timestamp: number;
      time: number;
      received: number;
      propagation: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transactions: any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      uncles: any[];
    };
    propagationAvg: number;
  };
  readable?: {
    latencyClass: string;
    latency: string;
  };
}

interface NodesProps {
  nodes?: Node[];
  bestBlock?: number;
}

const Nodes: React.FC<NodesProps> = ({ nodes = [], bestBlock = 0 }) => {
  const [pinnedNodes, setPinnedNodes] = useState<Set<string | number>>(new Set());

  // Toggle pin status for a node
  const togglePin = (nodeId: string | number) => {
    setPinnedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Sort nodes with pinned ones first
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const aIsPinned = pinnedNodes.has(a.id);
      const bIsPinned = pinnedNodes.has(b.id);
      
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      return 0;
    });
  }, [nodes, pinnedNodes]);

  // Helper functions for styling classes
  const getNodeClass = (node: Node) => {
    // Check direct properties first, then stats if it exists
    const active = node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false);
    const peers = node.stats?.peers ?? node.peers ?? 0;
    
    if (!active) return 'text-gray-400';
    if (peers === 0) return 'text-red-400';
    return getPeerClass(peers, active);
  };

  const getPeerClass = (peers: number, active: boolean) => {
    if (!active) return 'text-gray-400';
    if (peers <= 1) return 'text-red-400';
    if (peers < 4) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getLatencyClass = (node: Node) => {
    // Check direct properties first, then stats if it exists
    const active = node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false);
    const latency = node.stats?.latency ?? (typeof node.latency === 'object' ? parseInt(node.latency?.latency || '0') : (node.latency ? parseInt(String(node.latency)) : 0));
    
    if (!active) return 'text-red-400';
    if (latency <= 100) return 'text-green-400';
    if (latency <= 1000) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBlockClass = (node: Node, bestBlock: number) => {
    // Check direct properties first, then stats if it exists
    const active = node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false);
    const blockNumber = node.stats?.block?.number ?? node.block ?? 0;
    
    if (!active) return 'text-gray-400';
    if (blockNumber < bestBlock) return 'text-yellow-400';
    return 'text-white';
  };

  const getMiningClass = (node: Node) => {
    // Check direct properties first, then stats if it exists
    const active = node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false);
    const mining = node.stats?.mining ?? node.mining ?? false;
    
    if (!active) return 'text-gray-400';
    return mining ? 'text-green-400' : 'text-red-400';
  };

  const getUptimeClass = (uptime: number, active: boolean) => {
    if (!active) return 'text-gray-400';
    if (uptime >= 95) return 'text-green-400';
    if (uptime >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatLatency = (node: Node) => {
    // Check direct properties first, then stats if it exists
    const active = node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false);
    const latency = node.stats?.latency ?? (typeof node.latency === 'object' && node.latency && 'latency' in node.latency ? parseInt(node.latency.latency || '0') : (node.latency ? parseInt(String(node.latency)) : 0));
    
    if (!active) return 'offline';
    return `${latency} ms`;
  };

  const formatNodeVersion = (nodeInfo: string) => {
    if (!nodeInfo) return '';
    const parts = nodeInfo.split('/');
    if (parts[0]) {
      parts[0] = parts[0].replace('Ethereum(++)', 'Eth');
      if (parts[0].indexOf('pyethapp') === 0) {
        parts[0] = 'pyeth';
      }
    }
    return parts.join('/');
  };

  const formatBlockTime = (node: Node) => {
    // Check if we have the new server-calculated seconds ago value
    const secondsAgo = typeof node.lastBlockTime === 'number' ? node.lastBlockTime : null;
    
    if (secondsAgo !== null) {
      // For VirBiCoin nodes, show "Live" if very recent (< 30 seconds)
      if (node.id.toString().includes('Gvbc') && secondsAgo < 30) {
        return 'Live';
      }
      
      // Format the time difference
      if (secondsAgo === 0) return 'Live';
      if (secondsAgo < 60) return `${secondsAgo}s ago`;
      if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
      if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
      return `${Math.floor(secondsAgo / 86400)}d ago`;
    }
    
    // Fallback to old timestamp-based calculation
    // Try to get received time from multiple sources
    const received = node.stats?.block?.received || node.stats?.block?.timestamp || node.blockTimestamp;
    
    // For VirBiCoin nodes, always show "Live" if active since we know timestamps can be corrupted
    if (node.id.toString().includes('Gvbc') && node.stats?.active) {
      return 'Live';
    }
    
    if (!received) {
      // For real nodes without timestamp, show "Live" instead of "-"
      if (node.id.toString().includes('Gvbc') || (!node.id.toString().includes('historical') && !node.id.toString().includes('test'))) {
        return 'Live';
      }
      return '-';
    }
    
    // Handle corrupted/truncated timestamps from API (like 1753 instead of proper Unix timestamp)
    if (received < 1e6) {
      return 'Live';
    }
    
    // Additional validation for VirBiCoin timestamps that may be corrupted
    if (node.id.toString().includes('Gvbc') && received < 1e10) {
      return 'Live';
    }
    
    const now = Date.now();
    
    // Check if timestamp is in seconds (< 1e12) or milliseconds (>= 1e12)
    const receivedMs = received < 1e12 ? received * 1000 : received;
    const diff = Math.floor((now - receivedMs) / 1000); // Convert to seconds
    
    // Handle invalid timestamps (future or very old)
    if (diff < 0 || diff > 86400 * 365) { // More than 1 year
      return 'Live';
    }
    
    // For very recent blocks (< 30 seconds), show as "Live" for active nodes
    if (diff < 30 && node.stats?.active) {
      return 'Live';
    }
    
    // Standard time formatting for valid timestamps
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatPropagation = (node: Node) => {
    const propagation = node.stats?.block?.propagation || node.propagation || 0;
    
    if (!propagation || propagation === 0) {
      // For real nodes without propagation data, show reasonable default
      if (node.id.toString().includes('Gvbc') || (!node.id.toString().includes('historical') && !node.id.toString().includes('test'))) {
        return '0ms';
      }
      return '-';
    }
    
    return `${propagation}ms`;
  };

  const formatAvgPropagation = (node: Node) => {
    const avgPropagation = node.stats?.propagationAvg || node.propagationAvg || 0;
    
    if (!avgPropagation || avgPropagation === 0) {
      // For real nodes without avg propagation data, show reasonable default
      if (node.id.toString().includes('Gvbc') || (!node.id.toString().includes('historical') && !node.id.toString().includes('test'))) {
        return '0ms';
      }
      return '-';
    }
    
    return `${avgPropagation}ms`;
  };

  // Get propagation color class (like GitHub original implementation)
  const getPropagationClass = (node: Node) => {
    const propagation = Number(node.stats?.block?.propagation || node.propagation || 0);
    
    // Check if node is active - be more lenient for VirBiCoin nodes
    const isActive = node.stats?.active ?? (node.id.toString().includes('Gvbc') ? true : false);
    
    if (!isActive) return 'propagation-inactive';
    
    if (propagation === 0) return 'propagation-zero'; // Blue for 0ms (like original text-info)
    if (propagation < 1000) return 'propagation-fast'; // Green for < 1s
    if (propagation < 3000) return 'propagation-medium'; // Yellow for < 3s
    if (propagation < 7000) return 'propagation-slow'; // Orange for < 7s
    return 'propagation-very-slow'; // Red for >= 7s
  };

  // Get average propagation color class
  const getAvgPropagationClass = (node: Node) => {
    const avgPropagation = Number(node.stats?.propagationAvg || node.propagationAvg || 0);
    
    // Check if node is active - be more lenient for VirBiCoin nodes
    const isActive = node.stats?.active ?? (node.id.toString().includes('Gvbc') ? true : false);
    
    if (!isActive) return 'propagation-inactive';
    
    if (avgPropagation === 0) return 'propagation-zero'; // Blue for 0ms (like original text-info)
    if (avgPropagation < 1000) return 'propagation-fast'; // Green for < 1s
    if (avgPropagation < 3000) return 'propagation-medium'; // Yellow for < 3s
    if (avgPropagation < 7000) return 'propagation-slow'; // Orange for < 7s
    return 'propagation-very-slow'; // Red for >= 7s
  };

  const formatHash = (hash: string) => {
    if (!hash) return '';
    return hash.substring(0, 8) + '...';
  };

const formatTotalDifficulty = (value: number | undefined): string => {
  if (!value || value === 0) return '-';
  
  const TH = 1e12;
  const GH = 1e9;
  const MH = 1e6;

  if (value >= TH) {
    const thValue = value / TH;
    // For very large values, use fewer decimal places
    if (thValue >= 100) {
      return `${thValue.toFixed(0)}T`;
    } else {
      return `${thValue.toFixed(1)}T`;
    }
  } else if (value >= GH) {
    const ghValue = value / GH;
    if (ghValue >= 100) {
      return `${ghValue.toFixed(0)}G`;
    } else {
      return `${ghValue.toFixed(1)}G`;
    }
  } else if (value >= MH) {
    const mhValue = value / MH;
    if (mhValue >= 100) {
      return `${mhValue.toFixed(0)}M`;
    } else {
      return `${mhValue.toFixed(1)}M`;
    }
  } else {
    return `${value.toFixed(0)}H`;
  }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatUptime = (uptime: any) => {
    if (typeof uptime === 'object' && uptime !== null) {
      // Handle object uptime like the server sends
      if (uptime.lastStatus !== undefined) {
        const status = uptime.lastStatus;
        if (typeof status === 'boolean') {
          return status ? '100.0%' : '0.0%';
        } else {
          return `${Number(status).toFixed(1)}%`;
        }
      }
      if (uptime.up !== undefined && uptime.down !== undefined) {
        const total = uptime.up + uptime.down;
        const percentage = total > 0 ? (uptime.up / total) * 100 : 0;
        return `${percentage.toFixed(1)}%`;
      }
      return '-';
    }
    if (typeof uptime === 'number') {
      return `${uptime.toFixed(1)}%`;
    }
    return '-';
  };

  return (
    <div className="bg-[#111] text-white p-6 rounded-lg border border-[#222]">
      <h2 className="text-xl font-bold mb-4">Nodes</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left p-2 w-8">📌</th>
              <th className="text-left p-2 w-36">Node Name</th>
              <th className="text-left p-2 w-56">Node Type</th>
              <th className="text-left p-2 w-20">Latency</th>
              <th className="text-left p-2 w-16">Mining</th>
              <th className="text-left p-2 w-16">Peers</th>
              <th className="text-left p-2 w-20">Pending</th>
              <th className="text-left p-2 w-20">Last Block</th>
              <th className="text-left p-2 w-20">Block Hash</th>
              <th className="text-left p-2 w-24">Total Difficulty</th>
              <th className="text-left p-2 w-16">Txs</th>
              <th className="text-left p-2 w-16">Uncles</th>
              <th className="text-left p-2 w-24">Block Time</th>
              <th className="text-left p-2 w-24">Propagation</th>
              <th className="text-left p-2 w-24">Avg Propagation</th>
              <th className="text-left p-2 w-16">Uptime</th>
            </tr>
          </thead>
          <tbody>
            {sortedNodes.length === 0 ? (
              <tr>
                <td colSpan={16} className="text-center p-8 text-gray-400">
                  No nodes connected
                </td>
              </tr>
            ) : (
              sortedNodes.map((node) => (
                <tr
                  key={node.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 ${getNodeClass(node)}`}
                >
                  <td className="p-2 text-center">
                    <button
                      onClick={() => togglePin(node.id)}
                      className="hover:scale-110 transition-transform cursor-pointer"
                    >
                      {pinnedNodes.has(node.id) ? (
                        <span className="text-green-400">📌</span>
                      ) : (
                        <span className="text-gray-600 hover:text-gray-400">⚪</span>
                      )}
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="font-medium">{node.info?.name || node.name}</div>
                    {node.geo && (
                      <div className="text-xs text-gray-400">
                        {node.geo.city && `${node.geo.city}, `}{node.geo.country}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="text-xs">
                      {formatNodeVersion(node.info?.node || '')}
                    </div>
                  </td>
                  <td className={`p-2 ${getLatencyClass(node)}`}>
                    {formatLatency(node)}
                  </td>
                  <td className={`p-2 ${getMiningClass(node)}`}>
                    {(node.stats?.mining ?? node.mining) ? '⛏️' : '-'}
                  </td>
                  <td className={`p-2 ${getPeerClass((() => {
                    const peers = node.stats?.peers ?? node.peers ?? 0;
                    return typeof peers === 'object' && peers !== null && 'value' in peers 
                      ? (peers as { value: number }).value ?? 0 
                      : (typeof peers === 'number' ? peers : 0);
                  })(), node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false))}`}>
                    {(() => {
                      const peers = node.stats?.peers ?? node.peers ?? 0;
                      return typeof peers === 'object' && peers !== null && 'value' in peers 
                        ? (peers as { value: number }).value ?? 0 
                        : (typeof peers === 'number' ? peers : 0);
                    })()}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const pending = node.stats?.pending ?? node.pending ?? 0;
                      return typeof pending === 'object' && pending !== null && 'value' in pending 
                        ? (pending as { value: number }).value ?? 0 
                        : (typeof pending === 'number' ? pending : 0);
                    })()}
                  </td>
                  <td className={`p-2 ${getBlockClass(node, bestBlock)}`}>
                    #{(() => {
                      const blockNumber = node.stats?.block?.number ?? node.block ?? 0;
                      return typeof blockNumber === 'object' && blockNumber !== null && 'value' in blockNumber 
                        ? (blockNumber as { value: number }).value ?? 0 
                        : (typeof blockNumber === 'number' ? blockNumber : 0);
                    })()}
                  </td>
                  <td className="p-2 text-gray-400 font-mono text-xs">
                    {formatHash(node.stats?.block?.hash ?? node.blockHash ?? '')}
                  </td>
                  <td className="p-2 text-xs">
                    {(() => {
                      const difficulty = node.stats?.block?.totalDifficulty ?? node.totalDifficulty ?? 0;
                      return formatTotalDifficulty(difficulty);
                    })()}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const transactions = node.stats?.block?.transactions ?? node.transactions ?? 0;
                      if (Array.isArray(transactions)) return transactions.length;
                      return typeof transactions === 'object' && transactions !== null && 'value' in transactions 
                        ? (transactions as { value: number }).value ?? 0 
                        : (typeof transactions === 'number' ? transactions : 0);
                    })()}
                  </td>
                  <td className="p-2">
                    {(() => {
                      const uncles = node.stats?.block?.uncles ?? node.uncles ?? 0;
                      if (Array.isArray(uncles)) return uncles.length;
                      return typeof uncles === 'object' && uncles !== null && 'value' in uncles 
                        ? (uncles as { value: number }).value ?? 0 
                        : (typeof uncles === 'number' ? uncles : 0);
                    })()}
                  </td>
                  <td className="p-2 text-xs">
                    {formatBlockTime(node)}
                  </td>
                  <td className={`p-2 ${getPropagationClass(node)}`}>
                    {formatPropagation(node)}
                  </td>
                  <td className={`p-2 ${getAvgPropagationClass(node)}`}>
                    {formatAvgPropagation(node)}
                  </td>
                  <td className={`p-2 ${getUptimeClass(
                    (() => {
                      const uptimeValue = node.stats?.uptime ?? node.uptime;
                      if (typeof uptimeValue === 'object' && uptimeValue !== null) {
                        if (uptimeValue.lastStatus !== undefined) {
                          return uptimeValue.lastStatus;
                        }
                        if (uptimeValue.up !== undefined && uptimeValue.down !== undefined) {
                          const total = uptimeValue.up + uptimeValue.down;
                          return total > 0 ? (uptimeValue.up / total) * 100 : 0;
                        }
                        return 100;
                      }
                      return typeof uptimeValue === 'number' ? uptimeValue : 0;
                    })(),
                    node.stats?.active ?? (node.peers !== undefined ? node.peers >= 0 : false)
                  )}`}>
                    {formatUptime(node.stats?.uptime ?? node.uptime ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Nodes;
