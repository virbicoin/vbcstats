#!/usr/bin/env tsx
// Unified server: Next.js + WebSocket (Primus) on a single port
import expressApp from './lib/express.js';
import { banned, reserved } from './lib/utils/config.js';
import Collection from './lib/collection.js';
import type { NodeData } from './lib/collection.js';
import geoip from 'geoip-lite';
import http from 'http';
import Primus from 'primus';
import next from 'next';
import primusEmit from 'primus-emit';
import primusSparkLatency from 'primus-spark-latency';

const PORT = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const WS_SECRET_ENV = process.env.WS_SECRET || '';
const WS_SECRET = WS_SECRET_ENV.includes('|') ? WS_SECRET_ENV.split('|') : [WS_SECRET_ENV];

// Initialize Next.js
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const app = expressApp;
const server = http.createServer(app);

// Primus for client updates
const clientPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/primus',
  parser: 'JSON',
});
clientPrimus.plugin('emit', primusEmit);

// External Primus (if needed)
const externalPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/external',
  parser: 'JSON',
});
externalPrimus.plugin('emit', primusEmit);

// API Primus
const apiPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/api',
  parser: 'JSON',
});
apiPrimus.plugin('emit', primusEmit);
apiPrimus.plugin('spark-latency', primusSparkLatency);

// Add global error handling
apiPrimus.on('error', (err: Error) => {
  console.error('API Primus error:', err.message);
});

// Initialize Collection with externalPrimus
const Nodes = new Collection(externalPrimus);

// Block history for block time calculation with node-specific arrival tracking
interface BlockHistoryEntry {
  number: number;
  timestamp: number;
  firstArrival: number;
}

let blockHistory: BlockHistoryEntry[] = [];

// Function to set geographic information for a node
function setGeo(node: NodeData, ip: string): NodeData {
  if (!ip) return node;

  let cleanIp = ip;
  if (ip.substr(0, 7) === '::ffff:') {
    cleanIp = ip.substr(7);
  }

  if (!node.info) node.info = {};
  node.info.ip = cleanIp;

  const isLocalhost = cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp === '::1';
  const isPrivateIP =
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp) ||
    cleanIp === '0.0.0.0';

  if (isLocalhost || isPrivateIP) {
    console.log('Detected localhost/private IP:', cleanIp, '- Setting to Tokyo');
    node.geo = {
      range: [0, 0],
      country: 'JP',
      region: '13',
      eu: '0',
      timezone: 'Asia/Tokyo',
      city: 'Tokyo',
      ll: [35.6895, 139.6917],
      metro: 0,
      area: 50,
    };
    node.latitude = 35.6895;
    node.longitude = 139.6917;
    return node;
  }

  const geo = geoip.lookup(cleanIp);
  node.geo = geo as NodeData['geo'];

  if (geo && geo.ll && geo.ll.length === 2) {
    node.latitude = geo.ll[0];
    node.longitude = geo.ll[1];
  } else {
    console.log('Geo lookup failed for IP:', cleanIp, '- Setting to Tokyo');
    node.geo = {
      range: [0, 0],
      country: 'JP',
      region: '13',
      eu: '0',
      timezone: 'Asia/Tokyo',
      city: 'Tokyo',
      ll: [35.6895, 139.6917],
      metro: 0,
      area: 50,
    };
    node.latitude = 35.6895;
    node.longitude = 139.6917;
  }

  return node;
}

// Function to extract IP from spark connection
function getNodeIP(spark: any): string | null {
  if (spark.address && spark.address.ip) {
    return spark.address.ip;
  }

  if (spark.request && spark.request.connection && spark.request.connection.remoteAddress) {
    return spark.request.connection.remoteAddress;
  }

  if (spark.request && spark.request.headers) {
    const forwardedFor = spark.request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = spark.request.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }
  }

  return null;
}

// Helper function to get totalDifficulty from node
function getNodeTotalDifficulty(node: NodeData): number {
  if (!node?.stats?.block) return 0;
  const block = node.stats.block;
  let diff: number | string = block.totalDifficulty || block.totalDiff || block.difficulty || 0;
  if (typeof diff === 'string') {
    diff = parseInt(diff, 10) || 0;
  }
  return diff as number;
}

const MAX_BLOCK_HISTORY = 200;

// Node-specific block tracking for propagation calculation
const nodeBlockHistory = new Map<string, Map<number, number>>();

// Propagation history for each node
const propagationHistory = new Map<string, number[]>();
const MAX_PROPAGATION_HISTORY = 20;

// Add block to history with specific arrival time
function addBlockToHistoryWithArrival(
  blockNumber: number,
  timestamp: number,
  arrivalTime: number
): void {
  let blockTimestamp = timestamp;

  if (blockTimestamp < 1e6) {
    console.log('Detected truncated timestamp from API:', blockTimestamp, '- Using current time');
    blockTimestamp = Date.now();
  } else if (blockTimestamp < 10000000000) {
    blockTimestamp = blockTimestamp * 1000;
  }

  const existingIndex = blockHistory.findIndex((block) => block.number === blockNumber);

  if (existingIndex === -1) {
    blockHistory.push({
      number: blockNumber,
      timestamp: blockTimestamp,
      firstArrival: arrivalTime,
    });

    blockHistory.sort((a, b) => b.number - a.number);

    if (blockHistory.length > MAX_BLOCK_HISTORY) {
      blockHistory = blockHistory.slice(0, MAX_BLOCK_HISTORY);
    }

    console.log('Added block', blockNumber, 'to history with first arrival:', arrivalTime);
  }
}

// Add propagation time to node history
function addPropagationToHistory(nodeId: string, propagationMs: number): void {
  if (!propagationHistory.has(nodeId)) {
    propagationHistory.set(nodeId, []);
  }

  const nodeHistory = propagationHistory.get(nodeId)!;
  nodeHistory.push(propagationMs);

  if (nodeHistory.length > MAX_PROPAGATION_HISTORY) {
    nodeHistory.shift();
  }

  console.log(
    `Added propagation ${propagationMs}ms to ${nodeId} history. History length: ${nodeHistory.length}`
  );
}

// Calculate average propagation for a node
function calculateAvgPropagation(nodeId: string): number {
  const nodeHistory = propagationHistory.get(nodeId);
  if (!nodeHistory || nodeHistory.length === 0) {
    return 0;
  }

  const sum = nodeHistory.reduce((acc, prop) => acc + prop, 0);
  const avg = Math.round(sum / nodeHistory.length);

  console.log(
    `Calculated avg propagation for ${nodeId}: ${avg}ms (from ${nodeHistory.length} samples)`
  );
  return avg;
}

// Calculate average block time from block history
function calculateAvgBlockTime(_nodes: NodeData[]): number {
  const defaultBlockTime = 13;

  if (blockHistory.length < 2) {
    return defaultBlockTime;
  }

  const recentBlocks = blockHistory.slice(0, Math.min(50, blockHistory.length));

  if (recentBlocks.length < 2) {
    return defaultBlockTime;
  }

  let totalTimeDiff = 0;
  let validDiffs = 0;

  for (let i = 0; i < recentBlocks.length - 1; i++) {
    const currentBlock = recentBlocks[i];
    const previousBlock = recentBlocks[i + 1];

    if (currentBlock.number === previousBlock.number + 1) {
      const timeDiff = (currentBlock.timestamp - previousBlock.timestamp) / 1000;

      if (timeDiff > 0.5 && timeDiff < 300) {
        totalTimeDiff += timeDiff;
        validDiffs++;
      }
    }
  }

  if (validDiffs === 0) {
    return defaultBlockTime;
  }

  const avgBlockTime = totalTimeDiff / validDiffs;
  return Math.max(0.5, Math.min(120, Math.round(avgBlockTime * 100) / 100));
}

// Calculate network difficulty from connected nodes
function calculateDifficulty(nodes: NodeData[]): number {
  const defaultDifficulty = 94000000000;

  if (!nodes || nodes.length === 0) return defaultDifficulty;

  const difficulties = nodes
    .filter((node) => node.stats?.active && node.stats?.block)
    .map((node) => {
      let diff: number | string =
        node.stats!.block!.difficulty ||
        node.stats!.block!.totalDifficulty ||
        node.stats!.block!.totalDiff ||
        0;
      if (typeof diff === 'string') {
        diff = parseInt(diff, 10) || 0;
      }
      return diff as number;
    })
    .filter((diff) => diff > 0);

  if (difficulties.length === 0) return defaultDifficulty;

  return Math.max(...difficulties);
}

// Calculate average hashrate: difficulty / avgBlockTime
function calculateAvgHashrate(difficulty: number, avgBlockTime: number): number {
  if (!difficulty || !avgBlockTime || avgBlockTime <= 0) {
    return 4300000000;
  }

  return Math.round(difficulty / avgBlockTime);
}

// Calculate average gas price from connected nodes
function calculateAvgGasPrice(nodes: NodeData[]): number {
  const defaultGasPrice = 1000000000;

  if (!nodes || nodes.length === 0) return defaultGasPrice;

  const gasPrices = nodes
    .filter((node) => node.stats?.gasPrice)
    .map((node) => node.stats!.gasPrice!)
    .filter((price) => price > 0);

  if (gasPrices.length === 0) return defaultGasPrice;

  const avgPrice = gasPrices.reduce((sum, price) => sum + price, 0) / gasPrices.length;
  return Math.round(avgPrice);
}

// Calculate individual node's block time (seconds ago)
function calculateNodeBlockTime(node: NodeData): number {
  if (!node.stats?.block?.timestamp && !node.stats?.block?.time) {
    return 0;
  }

  const blockTimestamp = node.stats.block!.timestamp || node.stats.block!.time || 0;
  let blockTimeMs: number;

  if (blockTimestamp < 1e6) {
    return 0;
  } else if (blockTimestamp < 10000000000) {
    blockTimeMs = blockTimestamp * 1000;
  } else {
    blockTimeMs = blockTimestamp;
  }

  const currentTime = Date.now();
  const secondsAgo = Math.floor((currentTime - blockTimeMs) / 1000);

  return Math.max(0, secondsAgo);
}

// Helper to serialize node data for client
function serializeNode(node: NodeData) {
  return {
    id: node.id,
    name: node.info?.name || node.id,
    type: node.info?.type || node.info?.client || 'unknown',
    info: node.info || {},
    geo: node.geo || null,
    latitude: node.latitude || null,
    longitude: node.longitude || null,
    latency: node.stats?.latency || 0,
    mining: node.stats?.mining || false,
    peers: node.stats?.peers || 0,
    pending: node.stats?.pending || 0,
    block: node.stats?.block?.number || 0,
    blockHash: node.stats?.block?.hash || '',
    totalDifficulty: getNodeTotalDifficulty(node),
    transactions: node.stats?.block?.transactions?.length || 0,
    uncles: node.stats?.block?.uncles?.length || 0,
    lastBlockTime: calculateNodeBlockTime(node),
    propagation: node.stats?.block?.propagation || 0,
    propagationAvg: node.stats?.propagationAvg || 0,
    uptime: node.stats?.uptime
      ? typeof node.stats.uptime === 'number'
        ? { lastStatus: node.stats.uptime }
        : node.stats.uptime
      : node.uptime || { up: 0, down: 0, lastStatus: 100 },
  };
}

// Helper to calculate and return stats object
function calculateStats(allNodes: NodeData[]) {
  const activeNodes = allNodes.filter((node) => node.stats?.active || node.id);
  const bestBlock = Math.max(...allNodes.map((node) => node.stats?.block?.number || 0), 0);
  const avgBlockTime = calculateAvgBlockTime(allNodes);
  const totalDifficulty = calculateDifficulty(allNodes);
  const totalHashrate = calculateAvgHashrate(totalDifficulty, avgBlockTime);
  const totalUncles = activeNodes.reduce(
    (sum, node) => sum + (node.stats?.block?.uncles?.length || 0),
    0
  );
  const avgGasPrice = calculateAvgGasPrice(allNodes);
  const lastBlock = bestBlock > 0 ? Math.floor(Math.random() * Math.ceil(avgBlockTime)) : 0;

  return {
    bestBlock: { value: bestBlock },
    activeNodes: { value: allNodes.length },
    avgBlockTime: { value: avgBlockTime },
    difficulty: { value: Math.round(totalDifficulty) },
    avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
    uncles: { value: totalUncles },
    gasPrice: { value: avgGasPrice },
    gasLimit: { value: 8000000 },
    lastBlock: { value: lastBlock },
  };
}

// Update nodes and send data to all connected clients
setInterval(() => {
  const allNodes = Nodes.all();

  if (allNodes.length === 0) {
    console.log('No nodes available for update');
    return;
  }

  const updatedStats = calculateStats(allNodes);
  const nodesData = allNodes.map(serializeNode);

  clientPrimus.forEach((spark: any) => {
    if (!spark.readyState || spark.readyState !== 1) {
      return;
    }
    spark.write({ action: 'update', data: { nodes: nodesData, stats: updatedStats } });
  });
}, 1000);

// Charts callback
Nodes.setChartsCallback((err, charts) => {
  if (!err) {
    console.log('Broadcasting charts data');
    clientPrimus.forEach((spark: any) => {
      spark.write({ action: 'charts', data: charts });
    });
  }
});

// Handle API connections and events
let connections = 0;
const C_LIMIT = 5;
const C_RESET_MS = 30000;
setInterval(() => {
  if (connections > C_LIMIT) connections = 0;
}, C_RESET_MS);

apiPrimus.on('connection', (spark: any) => {
  console.log('API connection opened:', spark.address.ip);
  if (connections > C_LIMIT) {
    spark.end(undefined, { reconnect: true });
    return;
  }
  connections++;

  spark.on('error', (err: Error) => {
    console.error('API spark error:', spark.address.ip, err.message);
  });

  spark.on('disconnect', () => {
    console.log('API connection disconnected:', spark.address.ip);
    if (spark.auth && spark.nodeId) {
      Nodes.inactive(spark.nodeId, (err, info) => {
        if (!err && info) {
          clientPrimus.write({ action: 'inactive', data: info });
        }
      });
    }
  });

  spark.on('close', () => {
    console.log('API connection closed:', spark.address.ip);
  });

  spark.on('hello', (data: any) => {
    console.log('API CON Hello', data.id);
    if (
      !data.secret ||
      WS_SECRET.indexOf(data.secret) === -1 ||
      banned.includes(spark.address.ip) ||
      !data.id ||
      reserved.includes(data.id)
    ) {
      spark.end(undefined, { reconnect: false });
      console.error('API CON Closed - wrong auth', data);
      return;
    }

    spark.auth = true;
    spark.nodeId = data.id;
    data.ip = spark.address.ip;
    data.spark = spark.id;
    data.latency = spark.latency || 0;

    const nodeIP = getNodeIP(spark) || spark.address.ip;

    Nodes.add(data, (err, info) => {
      if (!err && info) {
        console.log('API CON Node added:', info.id);

        const addedNode = Nodes.getNode({ id: data.id });
        if (addedNode) {
          setGeo(addedNode, nodeIP);

          console.log('Node details:', {
            id: addedNode.id,
            ip: nodeIP,
            geo: addedNode.geo,
            latitude: addedNode.latitude,
            longitude: addedNode.longitude,
            active: addedNode.stats?.active,
            statsExists: !!addedNode.stats,
            blockNumber: addedNode.stats?.block?.number,
            infoType: addedNode.info?.type,
            infoClient: addedNode.info?.client,
            infoNode: addedNode.info?.node,
          });

          if (!addedNode.info) {
            addedNode.info = {};
          }
          if (!addedNode.info.type && !addedNode.info.client) {
            addedNode.info.client = 'gvbc/v1.0.0';
            addedNode.info.type = 'ethereum';
          }

          if (!addedNode.stats) {
            addedNode.stats = { active: true };
          }

          if (!addedNode.stats.active) {
            console.log('Setting node as active');
            addedNode.stats.active = true;
          }
        }

        spark.emit('ready');

        const allNodes = Nodes.all();
        console.log('Raw nodes from collection:', allNodes.length);

        const nodesData = allNodes.map(serializeNode);
        const stats = calculateStats(allNodes);

        // Broadcast to clients (stats variable used implicitly in the interval)
        void stats;
        void nodesData;
      }
    });
  });

  spark.on('update', (data: any) => {
    console.log(
      'API UPDATE received from',
      spark.nodeId,
      ':',
      JSON.stringify(data).substring(0, 200)
    );
    if (!spark.auth) return;
    Nodes.update(spark.nodeId, data, (err, info) => {
      if (!err && info) {
        console.log('Update processed, broadcasting:', info.id);
        clientPrimus.forEach((clientSpark: any) => {
          clientSpark.write({ action: 'update', data: info });
        });
      } else if (err) {
        console.error('Update error:', err);
      }
    });
  });

  spark.on('block', (data: any) => {
    const blockReceiveTime = Date.now();
    console.log(
      'API BLOCK received from',
      spark.nodeId,
      ':',
      JSON.stringify(data).substring(0, 200)
    );

    if (data.stats?.latency && typeof data.stats.latency === 'number' && data.stats.latency > 0) {
      spark.measuredLatency = data.stats.latency;
      const node = Nodes.getNode({ id: spark.nodeId });
      if (node && node.stats) {
        node.stats.latency = data.stats.latency;
      }
    }

    const block = data.block || data;
    if (!block || block.timestamp === undefined || block.timestamp === null) {
      console.error('Received block without timestamp:', data);
      return;
    }

    if (block.timestamp < 1e6) {
      console.log(
        'Fixing corrupted block timestamp from VirBiCoin API:',
        block.timestamp,
        '-> current time in milliseconds'
      );
      block.timestamp = Date.now();
      if (data.block) data.block.timestamp = Date.now();
    }

    // Calculate propagation using proper block-to-block timing per node
    if (data.block) {
      let blockTimestampMs: number;
      if (data.block.timestamp < 1e12) {
        blockTimestampMs = data.block.timestamp * 1000;
      } else {
        blockTimestampMs = data.block.timestamp;
      }

      if (!nodeBlockHistory.has(spark.nodeId)) {
        nodeBlockHistory.set(spark.nodeId, new Map());
      }

      const nodeBlocks = nodeBlockHistory.get(spark.nodeId)!;
      let propagationMs = 0;
      let arrivedTime = blockReceiveTime;

      if (nodeBlocks.has(data.block.number)) {
        console.log(
          'Node',
          spark.nodeId,
          'already sent block',
          data.block.number,
          '- skipping duplicate'
        );
        return;
      }

      const existingBlock = blockHistory.find((b) => b.number === data.block.number);

      if (existingBlock) {
        propagationMs = Math.max(0, blockReceiveTime - existingBlock.firstArrival);
        arrivedTime = existingBlock.firstArrival;
        console.log(
          'Block',
          data.block.number,
          'from',
          spark.nodeId,
          '- propagation from first arrival:',
          propagationMs,
          'ms'
        );
      } else {
        propagationMs = 0;
        arrivedTime = blockReceiveTime;
        console.log(
          'Block',
          data.block.number,
          'first arrival from',
          spark.nodeId,
          '- reference time set'
        );
      }

      nodeBlocks.set(data.block.number, blockReceiveTime);

      if (nodeBlocks.size > 50) {
        const oldestBlock = Math.min(...nodeBlocks.keys());
        nodeBlocks.delete(oldestBlock);
      }

      data.block.received = blockReceiveTime;
      data.block.arrived = arrivedTime;
      data.block.propagation = Math.round(propagationMs);

      console.log('Block propagation calculated (per-node tracking):', {
        blockNumber: data.block.number,
        nodeId: spark.nodeId,
        blockTimestamp: data.block.timestamp,
        blockTimestampMs,
        firstArrival: arrivedTime,
        receiveTime: blockReceiveTime,
        propagationMs,
      });

      addBlockToHistoryWithArrival(data.block.number, blockTimestampMs, arrivedTime);
    }

    if (!spark.auth) return;
    Nodes.addBlock(spark.nodeId, data.block || data, (err, info) => {
      if (!err && info) {
        console.log('Block processed, broadcasting:', info.id);

        if (data.block && data.block.propagation !== undefined) {
          addPropagationToHistory(spark.nodeId, data.block.propagation);

          const avgPropagation = calculateAvgPropagation(spark.nodeId);
          if (info.stats) {
            info.stats.propagationAvg = avgPropagation;
          }
        }

        const allNodes = Nodes.all();
        const updatedStats = calculateStats(allNodes);
        const nodesData = allNodes.map(serializeNode);

        clientPrimus.forEach((clientSpark: any) => {
          clientSpark.write({
            action: 'block',
            data: { nodes: nodesData, stats: updatedStats },
          });

          if (clientSpark && clientSpark.id && !clientSpark.destroyed) {
            try {
              const serverTime = Date.now();
              clientSpark.write({ action: 'client-ping', data: { serverTime } });
            } catch (error) {
              console.error('Error sending immediate ping:', error);
            }
          }
        });
      } else if (err) {
        console.error('Block error:', err);
      }
    });
  });

  spark.on('pending', (data: any) => {
    console.log(
      'API PENDING received from',
      spark.nodeId,
      ':',
      JSON.stringify(data).substring(0, 100)
    );
    if (!spark.auth) return;
    Nodes.updatePending(spark.nodeId, data.stats || data, (err, info) => {
      if (!err && info) {
        console.log('Pending processed, broadcasting:', info.id);
        clientPrimus.forEach((clientSpark: any) => {
          clientSpark.write({ action: 'pending', data: info });
        });
      } else if (err) {
        console.error('Pending error:', err);
      }
    });
  });

  spark.on('stats', (data: any) => {
    console.log(
      'API STATS received from',
      spark.nodeId,
      ':',
      JSON.stringify(data).substring(0, 200)
    );
    if (!spark.auth) return;

    const statsData = data.stats || data;
    if (statsData.latency && typeof statsData.latency === 'number' && statsData.latency > 0) {
      spark.measuredLatency = statsData.latency;
    }

    Nodes.updateStats(spark.nodeId, statsData, (err, info) => {
      if (!err && info) {
        console.log('Stats processed, broadcasting:', info.id);

        const allNodes = Nodes.all();
        const updatedStats = calculateStats(allNodes);
        const nodesData = allNodes.map(serializeNode);

        clientPrimus.forEach((clientSpark: any) => {
          clientSpark.write({
            action: 'stats',
            data: { nodes: nodesData, stats: updatedStats },
          });
        });
      } else if (err) {
        console.error('Stats error:', err);
      }
    });
  });

  spark.on('history', (data: any) => {
    if (!spark.auth) return;
    Nodes.addHistory(spark.id, data, (err, info) => {
      if (!err && info) {
        clientPrimus.forEach((clientSpark: any) => {
          clientSpark.write({ action: 'history', data: info });
        });
      }
    });
  });

  spark.on('node-ping', (data: any) => {
    if (!spark.auth) return;
    console.log('API PIN Ping from:', data.id || spark.nodeId, 'clientTime:', data.clientTime);
    spark.emit('node-pong', {
      clientTime: data.clientTime,
      serverTime: Date.now(),
    });
  });

  spark.on('node-pong', (_data: any) => {
    if (!spark.auth) return;
    if (spark.pingStartTime && spark.nodeId) {
      const latency = Math.ceil((Date.now() - spark.pingStartTime) / 2);

      const node = Nodes.getNode({ id: spark.nodeId });
      if (node && node.stats) {
        node.stats.latency = latency;
      }

      spark.measuredLatency = latency;
      spark.latency = latency;
    }
  });

  spark.on('latency', (data: any) => {
    if (!spark.auth) return;

    const nodeId = data.id || spark.nodeId;
    let latencyValue = 0;
    if (typeof data.latency === 'string') {
      latencyValue = parseInt(data.latency, 10);
    } else if (typeof data.latency === 'number') {
      latencyValue = data.latency;
    }

    console.log('API PIN Latency from:', nodeId, 'value:', latencyValue, 'ms');

    if (latencyValue > 0 && !isNaN(latencyValue)) {
      spark.measuredLatency = latencyValue;
      spark.latency = latencyValue;

      const node = Nodes.getNode({ id: nodeId });
      if (node && node.stats) {
        node.stats.latency = latencyValue;
        console.log('Updated node latency:', nodeId, '->', latencyValue, 'ms');
      }

      clientPrimus.forEach((clientSpark: any) => {
        clientSpark.write({
          action: 'latency',
          data: { id: nodeId, latency: latencyValue },
        });
      });
    }
  });

  spark.on('end', () => {
    if (spark.nodeId) {
      Nodes.inactive(spark.nodeId, (err, info) => {
        if (!err && info) {
          clientPrimus.write({ action: 'inactive', data: info });
        }
      });
    }
  });
});

// Handle client connections
clientPrimus.on('connection', (spark: any) => {
  console.log('Client connected to /primus');
  console.log('Connection ID:', spark.id);
  console.log('Remote address:', spark.address);

  spark.pingCompleted = false;

  spark.on('ready', () => {
    console.log('Client ready, sending initial data');

    const allNodes = Nodes.all();
    const nodesData = allNodes.map(serializeNode);
    const stats = calculateStats(allNodes);

    spark.write({ action: 'init', data: { nodes: nodesData, stats } });
    Nodes.getCharts();
  });

  // Send initial data immediately
  const allNodesInit = Nodes.all();
  const nodesInit = allNodesInit.map(serializeNode);
  const statsInit = calculateStats(allNodesInit);

  const initData = { action: 'init', data: { nodes: nodesInit, stats: statsInit } };
  spark.write(initData);
  spark.write(initData);

  setTimeout(() => {
    if (spark.id && !spark.destroyed) {
      try {
        spark.write({ action: 'client-ping', data: { serverTime: Date.now() } });
      } catch (error) {
        console.error('Error sending immediate ping:', error);
      }
    }
  }, 1000);

  Nodes.getCharts();

  spark.on('data', (message: any) => {
    if (
      message &&
      (message.action === 'client-pong' || message.event === 'client-pong') &&
      message.data
    ) {
      const currentTime = Date.now();
      const originalPingTime = message.data.serverTime;

      if (originalPingTime) {
        const latency = Math.ceil((currentTime - originalPingTime) / 2);
        spark.write({
          action: 'client-latency',
          data: { latency },
        });
      }
    }
  });

  spark.on('close', () => {
    console.log('Spark connection closed');
  });

  spark.on('error', (err: Error) => {
    console.log('Spark connection error:', err.message);
  });
});

// Ping-pong system for latency measurement
setInterval(() => {
  let connectionCount = 0;
  clientPrimus.forEach((spark: any) => {
    if (spark && spark.id && !spark.destroyed) {
      connectionCount++;
      spark.pingCompleted = false;
    }
  });

  if (connectionCount === 0) {
    return;
  }

  let sentCount = 0;
  clientPrimus.forEach((spark: any) => {
    const isConnected = spark && spark.id && !spark.destroyed;

    if (isConnected && !spark.pingCompleted) {
      try {
        const serverTime = Date.now();
        spark.write({ action: 'client-ping', data: { serverTime } });
        sentCount++;
        spark.pingCompleted = true;
        setTimeout(() => {
          if (spark && !spark.destroyed) {
            spark.pingCompleted = false;
          }
        }, 8000);
      } catch (error) {
        console.error('Error sending ping to client:', error);
      }
    }
  });
  console.log('Sent independent ping to', sentCount, 'clients');
}, 10000);

// Cleanup interval
setInterval(() => {
  const allNodes = Nodes.all();
  const now = Date.now();

  allNodes.forEach((node) => {
    if (node.stats && node.stats.pending && node.stats.pending > 0) {
      const pendingAge = now - (node.stats.pendingUpdatedAt || 0);
      if (pendingAge > 30000) {
        console.log(
          `Resetting stale pending for ${node.id}: ${node.stats.pending} -> 0 (age: ${pendingAge}ms)`
        );
        node.stats.pending = 0;
      }
    }
  });

  const nodesData = allNodes.map(serializeNode);
  const stats = calculateStats(allNodes);

  clientPrimus.forEach((spark: any) => {
    spark.write({ action: 'init', data: { nodes: nodesData, stats } });
  });
  Nodes.getCharts();
}, 3600000);

// Ping API nodes periodically
setInterval(() => {
  apiPrimus.forEach((spark: any) => {
    if (spark && spark.auth && spark.nodeId && !spark.destroyed) {
      spark.pingStartTime = Date.now();
      try {
        spark.emit('node-ping', { serverTime: spark.pingStartTime });
      } catch (error) {
        console.error(`Error pinging API node ${spark.nodeId}:`, error);
      }
    }
  });
}, 5000);

// Prepare Next.js and start the unified server
nextApp
  .prepare()
  .then(() => {
    app.all('{*path}', (req: any, res: any) => {
      return nextHandler(req, res);
    });

    server.listen(PORT, () => {
      console.log(
        `Server listening on http://localhost:${PORT} (${dev ? 'development' : 'production'})`
      );
    });
  })
  .catch((err: Error) => {
    console.error('Failed to start Next.js:', err);
    process.exit(1);
  });
