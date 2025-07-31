#!/usr/bin/env node
// Simple server without Next.js integration
const expressApp = require('./lib/express');
const { banned, reserved } = require('./lib/utils/config');
const Collection = require('./lib/collection');
const geoip = require('geoip-lite');
const http = require('http');
const Primus = require('primus');

const PORT = parseInt(process.env.PORT_SERVER || '4000', 10);
const WS_SECRET_ENV = process.env.WS_SECRET || '';
const WS_SECRET = WS_SECRET_ENV.includes('|') ? WS_SECRET_ENV.split('|') : [WS_SECRET_ENV];

const app = expressApp;
const server = http.createServer(app);

// Primus for client updates
const clientPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/primus',
  parser: 'JSON'
});
clientPrimus.plugin('emit', require('primus-emit'));

// External Primus (if needed)
const externalPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/external',
  parser: 'JSON'
});
externalPrimus.plugin('emit', require('primus-emit'));

// API Primus
const apiPrimus = new Primus(server, {
  transformer: 'websockets',
  pathname: '/api',
  parser: 'JSON'
});
apiPrimus.plugin('emit', require('primus-emit'));
apiPrimus.plugin('spark-latency', require('primus-spark-latency'));

// Add global error handling
apiPrimus.on('error', (err) => {
  console.error('API Primus error:', err.message);
});

// Initialize Collection with externalPrimus
const Nodes = new Collection(externalPrimus);

// Block history for block time calculation with node-specific arrival tracking
let blockHistory = [];

// Function to set geographic information for a node (based on original vbcstats implementation)
function setGeo(node, ip) {
  if (!ip) return node;
  
  // Handle IPv6-mapped IPv4 addresses
  let cleanIp = ip;
  if (ip.substr(0, 7) === "::ffff:") {
    cleanIp = ip.substr(7);
  }
  
  // Set IP info
  if (!node.info) node.info = {};
  node.info.ip = cleanIp;
  
  // For development/testing: provide sample coordinates for localhost and private IPs
  if (cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
    // Generate deterministic sample coordinates based on node ID for testing
    const nodeId = node.id || 'unknown';
    let seed = 0;
    for (let i = 0; i < nodeId.length; i++) {
      seed = ((seed << 5) - seed) + nodeId.charCodeAt(i);
      seed = seed & seed; // Convert to 32bit integer
    }
    
    // Create sample coordinates for testing (avoiding extreme polar regions)
    const absSeed = Math.abs(seed);
    const latitude = -60 + ((absSeed % 1000) / 1000) * 130; // Range: -60 to +70
    const longitude = -180 + ((absSeed >> 10) % 1000) / 1000 * 360; // Range: -180 to +180
    
    // Create mock geo object similar to geoip-lite format
    node.geo = {
      range: [0, 0],
      country: 'XX',
      region: 'TEST',
      eu: '0',
      timezone: 'UTC',
      city: 'Test City',
      ll: [latitude, longitude],
      metro: 0,
      area: 1000
    };
    
    node.latitude = latitude;
    node.longitude = longitude;
    
    console.log(`Test geo data generated for ${nodeId} (${cleanIp}):`, {
      latitude: latitude,
      longitude: longitude,
      country: 'XX',
      city: 'Test City'
    });
    
    return node;
  }
  
  // Get geo information using geoip-lite for real IPs
  const geo = geoip.lookup(cleanIp);
  node.geo = geo;
  
  // If geo information is available, set latitude and longitude
  if (geo && geo.ll && geo.ll.length === 2) {
    node.latitude = geo.ll[0];  // latitude
    node.longitude = geo.ll[1]; // longitude
    
    console.log(`Real geo data found for ${node.id} (${cleanIp}):`, {
      latitude: geo.ll[0],
      longitude: geo.ll[1],
      country: geo.country,
      city: geo.city
    });
  } else {
    console.log(`No geo data found for ${node.id} (${cleanIp})`);
  }
  
  return node;
}

// Function to extract IP from spark connection (based on original implementation)
function getNodeIP(spark) {
  if (spark.address && spark.address.ip) {
    return spark.address.ip;
  }
  
  if (spark.request && spark.request.connection && spark.request.connection.remoteAddress) {
    return spark.request.connection.remoteAddress;
  }
  
  if (spark.request && spark.request.headers) {
    // Check for forwarded IP headers
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
// Add sample nodes for testing GeoIP functionality
function addSampleNodes() {
  const sampleNodes = [
    {
      id: 'Gvbc-Tokyo',
      ip: '202.32.74.59', // Japan
      info: { 
        name: 'Tokyo Node',
        client: '0.1.1',
        node: 'Gvbc/v1.9.36-stable/linux-amd64/go1.24.5',
        type: 'gvbc'
      },
      stats: {
        active: true,
        syncing: false,
        mining: true,
        hashrate: 1000000,
        peers: 12,
        gasPrice: 1000000000,
        uptime: 100,
        block: {
          number: 319800,
          hash: '0x1234567890abcdef',
          timestamp: Math.floor(Date.now() / 1000),
          arrived: Date.now(),
          received: Date.now(),
          propagation: 50
        }
      }
    },
    {
      id: 'Gvbc-Singapore',
      ip: '3.1.205.236', // Singapore
      info: { 
        name: 'Singapore Node',
        client: '0.1.1',
        node: 'Gvbc/v1.9.36-stable/linux-amd64/go1.24.5',
        type: 'gvbc'
      },
      stats: {
        active: true,
        syncing: false,
        mining: true,
        hashrate: 800000,
        peers: 15,
        gasPrice: 1000000000,
        uptime: 98,
        block: {
          number: 319799,
          hash: '0xabcdef1234567890',
          timestamp: Math.floor(Date.now() / 1000) - 15,
          arrived: Date.now() - 15000,
          received: Date.now() - 15000,
          propagation: 75
        }
      }
    },
    {
      id: 'Gvbc-Stockholm',
      ip: '185.94.111.1', // Sweden
      info: { 
        name: 'Stockholm Node',
        client: '0.1.1',
        node: 'Gvbc/v1.9.36-stable/linux-amd64/go1.24.5',
        type: 'gvbc'
      },
      stats: {
        active: true,
        syncing: false,
        mining: false,
        hashrate: 0,
        peers: 8,
        gasPrice: 1000000000,
        uptime: 95,
        block: {
          number: 319798,
          hash: '0x9876543210fedcba',
          timestamp: Math.floor(Date.now() / 1000) - 30,
          arrived: Date.now() - 30000,
          received: Date.now() - 30000,
          propagation: 120
        }
      }
    }
  ];

  // Add sample nodes with delay to avoid overwhelming the system
  sampleNodes.forEach((nodeData, index) => {
    setTimeout(() => {
      // Set geographic information
      const nodeWithGeo = setGeo(nodeData, nodeData.ip);
      
      // Add to collection
      Nodes.add(nodeWithGeo, (err, info) => {
        if (!err && info) {
          console.log(`Sample node added: ${info.id} with real GeoIP data`);
        }
      });
    }, (index + 1) * 5000); // 5 second delay between each node
  });
}

// Add sample nodes after server starts
setTimeout(() => {
  console.log('Adding sample nodes with real IP addresses for GeoIP testing...');
  addSampleNodes();
}, 10000); // Wait 10 seconds after server start

const MAX_BLOCK_HISTORY = 200; // Keep last 200 blocks for calculation

// Node-specific block tracking for propagation calculation (like GitHub implementation)
let nodeBlockHistory = new Map(); // nodeId -> Map(blockNumber -> arrivalTime)

// Propagation history for each node
let propagationHistory = new Map();
const MAX_PROPAGATION_HISTORY = 20; // Keep last 20 propagations per node

// Global best block tracking to prevent stale data
let globalBestBlock = 0;

// Calculate the current best block across all nodes consistently
function calculateBestBlock(nodes) {
  if (!nodes || nodes.length === 0) return globalBestBlock;
  
  const bestBlock = Math.max(...nodes.map(node => node.stats?.block?.number || 0), 0);
  
  // Only update global best block if the new value is higher
  if (bestBlock > globalBestBlock) {
    globalBestBlock = bestBlock;
  }
  
  return globalBestBlock;
}

// Add block to history
function addBlockToHistory(blockNumber, timestamp) {
  // Handle corrupted/truncated timestamps from VirBiCoin API
  let blockTimestamp = timestamp;
  
  // If timestamp is clearly truncated (< 1e6), use current time in milliseconds
  if (blockTimestamp < 1e6) {
    console.log('Detected truncated timestamp from API:', blockTimestamp, '- Using current time');
    blockTimestamp = Date.now(); // Use current time in milliseconds
  }
  // Convert timestamp to milliseconds if it's in seconds
  else if (blockTimestamp < 10000000000) {
    blockTimestamp = blockTimestamp * 1000;
  }
  
  // Check if block already exists
  const existingIndex = blockHistory.findIndex(block => block.number === blockNumber);
  
  if (existingIndex === -1) {
    // Add new block
    blockHistory.push({
      number: blockNumber,
      timestamp: blockTimestamp,
      firstArrival: Date.now() // Track first arrival time for propagation calculation
    });
    
    // Sort by block number (descending)
    blockHistory.sort((a, b) => b.number - a.number);
    
    // Keep only the latest blocks
    if (blockHistory.length > MAX_BLOCK_HISTORY) {
      blockHistory = blockHistory.slice(0, MAX_BLOCK_HISTORY);
    }
  }
}

// Add block to history with specific arrival time (for propagation calculation)
function addBlockToHistoryWithArrival(blockNumber, timestamp, arrivalTime) {
  // Handle corrupted/truncated timestamps from VirBiCoin API
  let blockTimestamp = timestamp;
  
  // If timestamp is clearly truncated (< 1e6), use current time in milliseconds
  if (blockTimestamp < 1e6) {
    console.log('Detected truncated timestamp from API:', blockTimestamp, '- Using current time');
    blockTimestamp = Date.now(); // Use current time in milliseconds
  }
  // Convert timestamp to milliseconds if it's in seconds
  else if (blockTimestamp < 10000000000) {
    blockTimestamp = blockTimestamp * 1000;
  }
  
  // Check if block already exists
  const existingIndex = blockHistory.findIndex(block => block.number === blockNumber);
  
  if (existingIndex === -1) {
    // Add new block with first arrival time
    blockHistory.push({
      number: blockNumber,
      timestamp: blockTimestamp,
      firstArrival: arrivalTime
    });
    
    // Sort by block number (descending)
    blockHistory.sort((a, b) => b.number - a.number);
    
    // Keep only the latest blocks
    if (blockHistory.length > MAX_BLOCK_HISTORY) {
      blockHistory = blockHistory.slice(0, MAX_BLOCK_HISTORY);
    }
    
    console.log('Added block', blockNumber, 'to history with first arrival:', arrivalTime);
  }
}

// Add propagation time to node history
function addPropagationToHistory(nodeId, propagationMs) {
  if (!propagationHistory.has(nodeId)) {
    propagationHistory.set(nodeId, []);
  }
  
  const nodeHistory = propagationHistory.get(nodeId);
  nodeHistory.push(propagationMs);
  
  // Keep only recent propagations
  if (nodeHistory.length > MAX_PROPAGATION_HISTORY) {
    nodeHistory.shift();
  }
  
  console.log(`Added propagation ${propagationMs}ms to ${nodeId} history. History length: ${nodeHistory.length}`);
}

// Calculate average propagation for a node
function calculateAvgPropagation(nodeId) {
  const nodeHistory = propagationHistory.get(nodeId);
  if (!nodeHistory || nodeHistory.length === 0) {
    return 0;
  }
  
  const sum = nodeHistory.reduce((acc, prop) => acc + prop, 0);
  const avg = Math.round(sum / nodeHistory.length);
  
  console.log(`Calculated avg propagation for ${nodeId}: ${avg}ms (from ${nodeHistory.length} samples)`);
  return avg;
}

// Calculate the last block time (seconds since most recent block)
function calculateLastBlockTime(allNodes) {
  if (!allNodes || allNodes.length === 0) return 0;
  
  // Find the most recent block timestamp across all nodes
  let mostRecentTimestamp = 0;
  for (const node of allNodes) {
    if (node.stats?.block?.timestamp) {
      let blockTimestamp = node.stats.block.timestamp;
      
      // Handle corrupted/truncated timestamps
      if (blockTimestamp < 1e6) {
        continue; // Skip invalid timestamps
      }
      // Convert to milliseconds if needed
      if (blockTimestamp < 10000000000) {
        blockTimestamp = blockTimestamp * 1000;
      }
      
      if (blockTimestamp > mostRecentTimestamp) {
        mostRecentTimestamp = blockTimestamp;
      }
    }
  }
  
  if (mostRecentTimestamp === 0) return 0;
  
  // Calculate seconds since most recent block
  const currentTime = Date.now();
  const secondsSinceLastBlock = Math.floor((currentTime - mostRecentTimestamp) / 1000);
  
  return Math.max(0, secondsSinceLastBlock);
}

// Calculate average block time from block history
function calculateAvgBlockTime(nodes) {
  const defaultBlockTime = 13; // GVBC default block time (13 seconds like Ethereum)
  
  if (blockHistory.length < 2) {
    return defaultBlockTime;
  }
  
  // Take the last 50 blocks (or less if not available) for more accurate average
  const recentBlocks = blockHistory.slice(0, Math.min(50, blockHistory.length));
  
  if (recentBlocks.length < 2) {
    return defaultBlockTime;
  }
  
  // Calculate average time between consecutive blocks
  let totalTimeDiff = 0;
  let validDiffs = 0;
  
  for (let i = 0; i < recentBlocks.length - 1; i++) {
    const currentBlock = recentBlocks[i];
    const previousBlock = recentBlocks[i + 1];
    
    // Only calculate if blocks are consecutive
    if (currentBlock.number === previousBlock.number + 1) {
      const timeDiff = (currentBlock.timestamp - previousBlock.timestamp) / 1000; // Convert to seconds
      
      // Only accept reasonable block times (between 0.5 and 300 seconds)
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
  const result = Math.max(0.5, Math.min(120, Math.round(avgBlockTime * 100) / 100));
  
  return result;
}

// Calculate network difficulty from connected nodes (like GitHub repo lib/history.js)
function calculateDifficulty(nodes) {
  const defaultDifficulty = 94000000000; // GVBC default difficulty
  
  if (!nodes || nodes.length === 0) return defaultDifficulty;
  
  // Get difficulties from active nodes
  const difficulties = nodes
    .filter(node => node.stats?.active && node.stats?.block)
    .map(node => {
      return node.stats.block.difficulty || 
             node.stats.block.totalDifficulty || 
             0;
    })
    .filter(diff => diff > 0);
  
  if (difficulties.length === 0) return defaultDifficulty;
  
  // Return the maximum difficulty (latest/highest)
  return Math.max(...difficulties);
}

// Calculate average hashrate: difficulty / avgBlockTime (like GitHub repo lib/history.js)
function calculateAvgHashrate(difficulty, avgBlockTime) {
  if (!difficulty || !avgBlockTime || avgBlockTime <= 0) {
    return 4300000000; // Default GVBC hashrate
  }
  
  return Math.round(difficulty / avgBlockTime);
}

// Calculate average gas price from connected nodes
function calculateAvgGasPrice(nodes) {
  const defaultGasPrice = 1000000000; // 1 Gwei for GVBC
  
  if (!nodes || nodes.length === 0) return defaultGasPrice;
  
  const gasPrices = nodes
    .filter(node => node.stats?.gasPrice)
    .map(node => node.stats.gasPrice)
    .filter(price => price > 0);
  
  if (gasPrices.length === 0) return defaultGasPrice;
  
  const avgPrice = gasPrices.reduce((sum, price) => sum + price, 0) / gasPrices.length;
  return Math.round(avgPrice);
}

// Calculate individual node's block time (seconds ago)
function calculateNodeBlockTime(node) {
  if (!node.stats?.block?.timestamp && !node.stats?.block?.time) {
    return 0; // No block data
  }
  
  const blockTimestamp = node.stats.block.timestamp || node.stats.block.time;
  let blockTimeMs;
  
  // Handle corrupted/truncated timestamps
  if (blockTimestamp < 1e6) {
    return 0; // Invalid timestamp
  }
  // Convert timestamp to milliseconds if it's in seconds
  else if (blockTimestamp < 10000000000) {
    blockTimeMs = blockTimestamp * 1000;
  } else {
    blockTimeMs = blockTimestamp;
  }
  
  const currentTime = Date.now();
  const secondsAgo = Math.floor((currentTime - blockTimeMs) / 1000);
  
  // Return positive seconds ago, or 0 if block is in future
  return Math.max(0, secondsAgo);
}

// Update nodes and send data to all connected clients
setInterval(() => {
  const allNodes = Nodes.all();
  
  if (allNodes.length === 0) {
    console.log('No nodes available for update');
    return;
  }
  
  const avgBlockTime = calculateAvgBlockTime(allNodes);
  
  clientPrimus.forEach((spark) => {
    if (!spark.readyState || spark.readyState !== 1) {
      return; // Skip disconnected clients
    }
    
    // 統計情報のみを定期的に更新（ノード一覧は初期化時のみ）
    const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
    const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
    const totalDifficulty = calculateDifficulty(allNodes);
    const totalHashrate = calculateAvgHashrate(totalDifficulty, avgBlockTime);
    const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
    const avgGasPrice = calculateAvgGasPrice(allNodes);
    const lastBlock = calculateLastBlockTime(allNodes); // Calculate actual last block time in seconds
    const updateTime = Date.now(); // Add millisecond timestamp like Nodes
    
    const updatedStats = {
      bestBlock: { value: bestBlock },
      activeNodes: { value: allNodes.length },
      avgBlockTime: { value: avgBlockTime },
      difficulty: { value: Math.round(totalDifficulty) },
      avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
      uncles: { value: totalUncles },
      gasPrice: { value: avgGasPrice },
      gasLimit: { value: 8000000 },
      lastBlock: { value: lastBlock },
      updateTime: updateTime // Millisecond precision timestamp
    };
    
    spark.write({ action: 'update', data: { stats: updatedStats } });
  });
}, 1000); // 1秒間隔でポーリング

// Charts callback
Nodes.setChartsCallback((err, charts) => {
  if (!err) {
    console.log('Broadcasting charts data');
    // Use forEach to write to each connected client
    clientPrimus.forEach((spark) => {
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

apiPrimus.on('connection', (spark) => {
  console.log('API connection opened:', spark.address.ip);
  if (connections > C_LIMIT) {
    spark.end(undefined, { reconnect: true });
    return;
  }
  connections++;
  
  // Add error handling
  spark.on('error', (err) => {
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
  
  spark.on('hello', (data) => {
    console.log('API CON Hello', data.id);
    if (!data.secret || WS_SECRET.indexOf(data.secret) === -1 || banned.includes(spark.address.ip) || !data.id || reserved.includes(data.id)) {
      spark.end(undefined, { reconnect: false });
      console.error('API CON Closed - wrong auth', data);
      return;
    }
    // Set auth flag and store node ID
    spark.auth = true;
    spark.nodeId = data.id;
    // Verify node exists or will be added
    data.ip = spark.address.ip;
    data.spark = spark.id;
    data.latency = spark.latency || 0;
    
    // Get IP from spark connection
    const nodeIP = getNodeIP(spark) || spark.address.ip;
    
    Nodes.add(data, (err, info) => {
      if (!err && info) {
        console.log('API CON Node added:', info.id);
        
        // Get the added node and set geo information
        const addedNode = Nodes.getNode({ id: data.id });
        if (addedNode) {
          // Set geographic information using geoip-lite
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
            infoNode: addedNode.info?.node
          });
          
          // Set default client type if not provided
          if (!addedNode.info) {
            addedNode.info = {};
          }
          if (!addedNode.info.type && !addedNode.info.client) {
            addedNode.info.client = 'gvbc/v1.0.0'; // Default client type
            addedNode.info.type = 'ethereum';
          }
          
          // Initialize stats if not exists
          if (!addedNode.stats) {
            addedNode.stats = { active: true };
          }
          
          // Force node to be active if not already
          if (!addedNode.stats.active) {
            console.log('Setting node as active');
            addedNode.stats.active = true;
          }
        }
        
        spark.emit('ready');
        
        // Send updated data to all clients when a node is added
        const allNodes = Nodes.all();
        console.log('Raw nodes from collection:', allNodes.length);
        
        // 新しいノードが追加された時のみ、そのノードの情報を送信
        const newNodeData = {
          id: addedNode.id,
          name: addedNode.info?.name || addedNode.id,
          type: addedNode.info?.type || addedNode.info?.client || 'unknown',
          info: addedNode.info || {},
          geo: addedNode.geo || null,
          latitude: addedNode.latitude || null,
          longitude: addedNode.longitude || null,
          latency: addedNode.stats?.latency || 0,
          mining: addedNode.stats?.mining || false,
          peers: addedNode.stats?.peers || 0,
          pending: addedNode.stats?.pending || 0,
          block: addedNode.stats?.block?.number || 0,
          blockHash: addedNode.stats?.block?.hash || '',
          totalDifficulty: addedNode.stats?.block?.totalDifficulty || 0,
          transactions: addedNode.stats?.block?.transactions?.length || 0,
          uncles: addedNode.stats?.block?.uncles?.length || 0,
          lastBlockTime: calculateNodeBlockTime(addedNode),
          propagation: addedNode.stats?.block?.propagation || 0,
          propagationAvg: addedNode.stats?.propagationAvg || 0,
          uptime: addedNode.stats?.uptime ? 
            (typeof addedNode.stats.uptime === 'number' ? 
              { lastStatus: addedNode.stats.uptime } : 
              addedNode.stats.uptime
            ) : 
            (addedNode.uptime || { up: 0, down: 0, lastStatus: 100 })
        };
        
        // 統計情報も更新
        const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
        const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
        const avgBlockTime = calculateAvgBlockTime(allNodes);
        const totalDifficulty = calculateDifficulty(allNodes);
        const totalHashrate = calculateAvgHashrate(totalDifficulty, avgBlockTime);
        const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
        const avgGasPrice = calculateAvgGasPrice(allNodes);
        const lastBlockTime = calculateLastBlockTime(allNodes);
        
        const updatedStats = {
          bestBlock: { value: bestBlock },
          activeNodes: { value: allNodes.length },
          avgBlockTime: { value: avgBlockTime },
          difficulty: { value: Math.round(totalDifficulty) },
          avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
          uncles: { value: totalUncles },
          gasPrice: { value: avgGasPrice },
          gasLimit: { value: 8000000 },
          lastBlock: { value: lastBlockTime }
        };
        
        // 新しいノードの追加を通知
        clientPrimus.forEach((clientSpark) => {
          clientSpark.write({ action: 'add', data: { 
            node: newNodeData,
            stats: updatedStats 
          }});
        });
      }
    });
  });

  // other event handlers
  spark.on('update', (data) => {
    console.log('API UPDATE received from', spark.nodeId, ':', JSON.stringify(data).substring(0, 200));
    if (!spark.auth) return;
    Nodes.update(spark.nodeId, data, (err, info) => {
      if (!err && info) {
        console.log('Update processed, broadcasting:', info.id);
        // 個別のノード更新と全体統計情報を送信
        const allStats = Nodes.getStats();
        clientPrimus.forEach((clientSpark) => {
          clientSpark.write({ action: 'update', data: {
            id: info.id,
            name: info.info?.name || info.id,
            latency: info.stats?.latency || 0,
            mining: info.stats?.mining || false,
            peers: info.stats?.peers || 0,
            pending: info.stats?.pending || 0,
            block: info.stats?.block?.number || 0,
            blockHash: info.stats?.block?.hash || '',
            totalDifficulty: info.stats?.block?.totalDifficulty || 0,
            transactions: info.stats?.block?.transactions?.length || 0,
            uncles: info.stats?.block?.uncles?.length || 0,
            lastBlockTime: calculateNodeBlockTime(info),
            propagation: info.stats?.block?.propagation || 0,
            propagationAvg: info.stats?.propagationAvg || 0,
            uptime: info.stats?.uptime ? 
              (typeof info.stats.uptime === 'number' ? 
                { lastStatus: info.stats.uptime } : 
                info.stats.uptime
              ) : 
              (info.uptime || { up: 0, down: 0, lastStatus: 100 }),
            stats: allStats
          }});
        });
      } else if (err) {
        console.error('Update error:', err);
      }
    });
  });

  spark.on('block', (data) => {
    const blockReceiveTime = Date.now(); // Precise millisecond timestamp when block was received
    console.log('API BLOCK received from', spark.nodeId, ':', JSON.stringify(data).substring(0, 200));
    
    let block = data.block || data;
    if (!block || block.timestamp === undefined || block.timestamp === null) {
      console.error('Received block without timestamp:', data);
      return;
    }
    
    // Fix corrupted timestamp BEFORE any processing
    if (block.timestamp < 1e6) {
      console.log('Fixing corrupted block timestamp from VirBiCoin API:', block.timestamp, '-> current time in milliseconds');
      block.timestamp = Date.now(); // Use current time in milliseconds
      data.block.timestamp = Date.now(); // Also update the original data
    }
    
    // Calculate propagation using proper block-to-block timing per node (like original implementation)
    if (data.block) {
      // Ensure timestamp is in milliseconds for calculation
      let blockTimestampMs;
      if (data.block.timestamp < 1e12) {
        // If timestamp is in seconds, convert to milliseconds
        blockTimestampMs = data.block.timestamp * 1000;
      } else {
        // Already in milliseconds
        blockTimestampMs = data.block.timestamp;
      }
      
      // Initialize node block history if needed
      if (!nodeBlockHistory.has(spark.nodeId)) {
        nodeBlockHistory.set(spark.nodeId, new Map());
      }
      
      const nodeBlocks = nodeBlockHistory.get(spark.nodeId);
      let propagationMs = 0;
      let arrivedTime = blockReceiveTime;
      
      // Check if this specific node has seen this block before
      if (nodeBlocks.has(data.block.number)) {
        // Node already sent this block - skip processing entirely
        console.log('Node', spark.nodeId, 'already sent block', data.block.number, '- skipping duplicate');
        return; // Skip all further processing for duplicate blocks
      } else {
        // Find the earliest arrival of this block from any node (for propagation reference)
        const existingBlock = blockHistory.find(b => b.number === data.block.number);
        
        if (existingBlock) {
          // Block exists from another node - calculate propagation from first arrival
          propagationMs = Math.max(0, blockReceiveTime - existingBlock.firstArrival);
          arrivedTime = existingBlock.firstArrival;
          console.log('Block', data.block.number, 'from', spark.nodeId, '- propagation from first arrival:', propagationMs, 'ms');
        } else {
          // First time seeing this block from any node - propagation is 0, this is the reference time
          propagationMs = 0;
          arrivedTime = blockReceiveTime;
          console.log('Block', data.block.number, 'first arrival from', spark.nodeId, '- reference time set');
          
          // Immediately update Best Block for first arrival (using millisecond precision like Nodes)
          // Update global best block with the new block number
          if (data.block.number > globalBestBlock) {
            globalBestBlock = data.block.number;
          }
          
          const newBestBlock = globalBestBlock;
          
          // Send immediate Best Block update to all clients with precise timing
          const immediateUpdateTime = Date.now();
          clientPrimus.forEach((clientSpark) => {
            clientSpark.write({ 
              action: 'stats', 
              data: { 
                stats: {
                  bestBlock: { value: newBestBlock },
                  updateTime: immediateUpdateTime // Add millisecond timestamp like Nodes
                }
              }
            });
          });
          
          console.log(`BEST BLOCK updated immediately for first arrival: ${newBestBlock} at ${immediateUpdateTime}ms`);
        }
        
        // Record this block for this specific node
        nodeBlocks.set(data.block.number, blockReceiveTime);
        
        // Clean old entries (keep last 50 blocks per node)
        if (nodeBlocks.size > 50) {
          const oldestBlock = Math.min(...nodeBlocks.keys());
          nodeBlocks.delete(oldestBlock);
        }
        
        // Store block in global history with first arrival time
        addBlockToHistoryWithArrival(data.block.number, blockTimestampMs, arrivedTime);
      }
      
      // Add propagation data to block (in milliseconds)
      data.block.received = blockReceiveTime;
      data.block.arrived = arrivedTime;
      data.block.propagation = Math.round(propagationMs);
      
      console.log('Block propagation calculated (per-node tracking):', {
        blockNumber: data.block.number,
        nodeId: spark.nodeId,
        blockTimestamp: data.block.timestamp,
        blockTimestampMs: blockTimestampMs,
        firstArrival: arrivedTime,
        receiveTime: blockReceiveTime,
        propagationMs: propagationMs
      });
    }
    
    if (!spark.auth) return;
    Nodes.addBlock(spark.nodeId, data.block || data, (err, info) => {
      if (!err && info) {
        console.log('Block processed, broadcasting:', info.id);
        
        // Add propagation to history and calculate average
        if (data.block && data.block.propagation !== undefined) {
          addPropagationToHistory(spark.nodeId, data.block.propagation);
          
          // Update node with calculated average propagation
          const avgPropagation = calculateAvgPropagation(spark.nodeId);
          if (info.stats) {
            info.stats.propagationAvg = avgPropagation;
          }
        }
        
        // Recalculate and broadcast updated network statistics based on actual data
        const allNodes = Nodes.all();
        const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
        const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
        
        // Calculate avgBlockTime using calculation function (from block history)
        const avgBlockTime = calculateAvgBlockTime(allNodes);
        
        // Calculate difficulty from latest block
        let totalDifficulty = 94000000000; // Default
        if (activeNodes.length > 0) {
          const difficulties = activeNodes
            .map(node => node.stats?.block?.difficulty || node.stats?.block?.totalDifficulty)
            .filter(diff => diff && diff > 0);
          
          if (difficulties.length > 0) {
            totalDifficulty = Math.max(...difficulties);
          }
        }
        
        // Calculate avgNetworkHashrate: difficulty / avgBlockTime
        const totalHashrate = Math.round(totalDifficulty / avgBlockTime);
        
        const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
        const avgGasPrice = 1000000000; // Always 1 Gwei for GVBC
        const lastBlock = calculateLastBlockTime(allNodes);
        
        const updatedStats = {
          bestBlock: { value: bestBlock },
          activeNodes: { value: allNodes.length },
          avgBlockTime: { value: avgBlockTime },
          difficulty: { value: Math.round(totalDifficulty) },
          avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
          uncles: { value: totalUncles },
          gasPrice: { value: avgGasPrice },
          gasLimit: { value: 8000000 },
          lastBlock: { value: lastBlock }
        };
        
        clientPrimus.forEach((clientSpark) => {
          // ブロック更新時は統計情報と該当ノードの情報のみ送信
          clientSpark.write({ action: 'block', data: { 
            id: info.id,
            block: info.stats?.block?.number || 0,
            blockHash: info.stats?.block?.hash || '',
            totalDifficulty: info.stats?.block?.totalDifficulty || 0,
            transactions: info.stats?.block?.transactions?.length || 0,
            uncles: info.stats?.block?.uncles?.length || 0,
            lastBlockTime: calculateNodeBlockTime(info),
            propagation: info.stats?.block?.propagation || 0,
            propagationAvg: info.stats?.propagationAvg || 0,
            stats: updatedStats 
          }});
          
          // Send immediate ping after block update to measure fresh latency
          if (clientSpark && clientSpark.id && !clientSpark.destroyed) {
            try {
              const serverTime = Date.now();
              console.log('Sending immediate ping after block update, serverTime:', serverTime);
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

  spark.on('pending', (data) => {
    console.log('API PENDING received from', spark.nodeId, ':', JSON.stringify(data).substring(0, 100));
    if (!spark.auth) return;
    Nodes.updatePending(spark.nodeId, data.stats || data, (err, info) => {
      if (!err && info) {
        console.log('Pending processed, broadcasting:', info.id);
        // 個別のノード更新のみ送信
        clientPrimus.forEach((clientSpark) => {
          clientSpark.write({ action: 'pending', data: {
            nodeId: spark.nodeId,
            nodeUpdate: {
              id: info.id,
              pending: info.stats?.pending || 0
            }
          }});
        });
      } else if (err) {
        console.error('Pending error:', err);
      }
    });
  });

  spark.on('stats', (data) => {
    console.log('API STATS received from', spark.nodeId, ':', JSON.stringify(data).substring(0, 200));
    if (!spark.auth) return;
    Nodes.updateStats(spark.nodeId, data.stats || data, (err, info) => {
      if (!err && info) {
        console.log('Stats processed, broadcasting:', info.id);
        
        // Recalculate and broadcast updated network statistics based on actual data
        const allNodes = Nodes.all();
        const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
        const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
        
        // Calculate avgBlockTime using calculation function (always 13 seconds for GVBC)
        const avgBlockTime = calculateAvgBlockTime(allNodes);
        
        // Calculate difficulty from latest block
        let totalDifficulty = 94000000000; // Default
        if (activeNodes.length > 0) {
          const difficulties = activeNodes
            .map(node => node.stats?.block?.difficulty || node.stats?.block?.totalDifficulty)
            .filter(diff => diff && diff > 0);
          
          if (difficulties.length > 0) {
            totalDifficulty = Math.max(...difficulties);
          }
        }
        
        // Calculate avgNetworkHashrate: difficulty / avgBlockTime
        const totalHashrate = Math.round(totalDifficulty / avgBlockTime);
        
        const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
        const avgGasPrice = 1000000000; // Always 1 Gwei for GVBC
        const lastBlock = calculateLastBlockTime(allNodes);
        
        const updatedStats = {
          bestBlock: { value: bestBlock },
          activeNodes: { value: allNodes.length },
          avgBlockTime: { value: avgBlockTime },
          difficulty: { value: Math.round(totalDifficulty) },
          avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
          uncles: { value: totalUncles },
          gasPrice: { value: avgGasPrice },
          gasLimit: { value: 8000000 },
          lastBlock: { value: lastBlock }
        };
        
        clientPrimus.forEach((clientSpark) => {
          // 統計更新時は統計情報のみ送信（ノード一覧は送信しない）
          clientSpark.write({ action: 'stats', data: { 
            stats: updatedStats 
          }});
        });
      } else if (err) {
        console.error('Stats error:', err);
      }
    });
  });

  spark.on('history', (data) => {
    if (!spark.auth) return;
    Nodes.addHistory(spark.id, data, (err, info) => {
      if (!err && info) {
        clientPrimus.forEach((clientSpark) => {
          clientSpark.write({ action: 'history', data: info });
        });
      }
    });
  });

  spark.on('node-ping', () => {
    if (!spark.auth) return;
    spark.emit('node-pong', { serverTime: Date.now() });
  });

  spark.on('latency', (data) => {
    if (!spark.auth) return;
    Nodes.updateLatency(spark.nodeId, data, (err, info) => {
      if (!err && info) {
        clientPrimus.write({ action: 'latency', data: info });
      }
    });
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
clientPrimus.on('connection', (spark) => {
  console.log('Client connected to /primus');
  
  // Development environment: Limit client connections to prevent accumulation
  if (process.env.NODE_ENV === 'development') {
    const activeConnections = clientPrimus.connections;
    console.log(`[DEV] Total active client connections: ${Object.keys(activeConnections).length}`);
    
    // If too many connections in development, close older ones
    const connectionIds = Object.keys(activeConnections);
    if (connectionIds.length > 3) { // Allow max 3 connections in development
      console.log(`[DEV] Too many connections (${connectionIds.length}), closing oldest ones`);
      // Close older connections (keep the newest 2)
      const connectionsToClose = connectionIds.slice(0, -2);
      connectionsToClose.forEach(id => {
        if (activeConnections[id] && activeConnections[id] !== spark) {
          console.log(`[DEV] Closing old connection: ${id}`);
          activeConnections[id].end();
        }
      });
    }
  }
  
  console.log('Initial connection readyState:', spark.readyState);
  console.log('Connection ID:', spark.id);
  console.log('Remote address:', spark.address);
  
  // Initialize ping completion status for new connections
  spark.pingCompleted = false;
  
  // Monitor readyState changes more frequently
  const checkReadyState = () => {
    console.log(`ReadyState for ${spark.id}: ${spark.readyState}, destroyed: ${spark.destroyed}`);
  };
  
  setTimeout(checkReadyState, 500);
  setTimeout(checkReadyState, 1000);
  setTimeout(checkReadyState, 2000);
  setTimeout(checkReadyState, 5000);
  
  spark.on('ready', () => {
    console.log('Client ready, sending initial data');
    console.log('ReadyState on ready event:', spark.readyState);
    // Send initial nodes and stats
    const allNodes = Nodes.all();
    const nodesData = allNodes.map(node => ({
      id: node.id,
      name: node.info?.name || node.id,
      type: node.info?.type || node.info?.client || 'unknown',
      info: node.info || {}, // Include the info object for client access
      geo: node.geo || null, // Include geo information
      latitude: node.latitude || null, // Include latitude from geoip
      longitude: node.longitude || null, // Include longitude from geoip
      latency: node.stats?.latency || 0,
      mining: node.stats?.mining || false,
      peers: node.stats?.peers || 0,
      pending: node.stats?.pending || 0,
      block: node.stats?.block?.number || 0,
      blockHash: node.stats?.block?.hash || '',
      totalDifficulty: node.stats?.block?.totalDifficulty || 0,
      transactions: node.stats?.block?.transactions?.length || 0,
      uncles: node.stats?.block?.uncles?.length || 0,
      lastBlockTime: calculateNodeBlockTime(node), // Individual node block time in seconds ago
      propagation: node.stats?.block?.propagation || 0,
      propagationAvg: node.stats?.propagationAvg || 0,
      uptime: node.stats?.uptime ? 
        (typeof node.stats.uptime === 'number' ? 
          { lastStatus: node.stats.uptime } : 
          node.stats.uptime
        ) : 
        (node.uptime || { up: 0, down: 0, lastStatus: 100 })
    }));
    
    // Calculate network statistics from actual data
    const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
    const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
    
    // Calculate actual network statistics using calculation functions
    const avgBlockTime = calculateAvgBlockTime(allNodes);
    const totalDifficulty = calculateDifficulty(allNodes);
    const totalHashrate = calculateAvgHashrate(totalDifficulty, avgBlockTime);
    
    const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
    const avgGasPrice = calculateAvgGasPrice(allNodes);
    const lastBlock = calculateLastBlockTime(allNodes);
    
    const stats = {
      bestBlock: { value: bestBlock },
      activeNodes: { value: allNodes.length },
      avgBlockTime: { value: avgBlockTime },
      difficulty: { value: Math.round(totalDifficulty) },
      avgNetworkHashrate: { value: Math.round(totalHashrate), unit: 'H/s' },
      uncles: { value: totalUncles },
      gasPrice: { value: avgGasPrice },
          gasLimit: { value: 8000000 },
      lastBlock: { value: lastBlock }
    };
    
    spark.write({ action: 'init', data: { nodes: nodesData, stats: stats } });
    Nodes.getCharts();
  });
  
  // Send initial data immediately
  const allNodesInit = Nodes.all();
  const nodesInit = allNodesInit.map(node => ({
    id: node.id,
    name: node.info?.name || node.id,
    type: node.info?.type || node.info?.client || 'unknown',
    latency: node.stats?.latency || 0,
    mining: node.stats?.mining || false,
    peers: node.stats?.peers || 0,
    pending: node.stats?.pending || 0,
    block: node.stats?.block?.number || 0,
    blockHash: node.stats?.block?.hash || '',
    totalDifficulty: node.stats?.block?.totalDifficulty || 0,
    transactions: node.stats?.block?.transactions?.length || 0,
    uncles: node.stats?.block?.uncles?.length || 0,
    lastBlockTime: calculateNodeBlockTime(node), // Individual node block time in seconds ago
    propagation: node.stats?.block?.propagation || 0,
    propagationAvg: node.stats?.propagationAvg || 0,
    uptime: node.stats?.uptime ? 
      (typeof node.stats.uptime === 'number' ? 
        { lastStatus: node.stats.uptime } : 
        node.stats.uptime
      ) : 
      (node.uptime || { up: 0, down: 0, lastStatus: 100 })
  }));
  
    // Calculate network statistics from actual data using calculation functions
    const activeNodesInit = allNodesInit.filter(node => node.stats?.active || node.id);
    const bestBlockInit = calculateBestBlock(allNodesInit); // Use consistent bestBlock calculation
    
    // Use actual calculation functions
    const avgBlockTimeInit = calculateAvgBlockTime(allNodesInit);
    const totalDifficultyInit = calculateDifficulty(allNodesInit);
    const totalHashrateInit = calculateAvgHashrate(totalDifficultyInit, avgBlockTimeInit);
    
    const totalUnclesInit = activeNodesInit.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
    const avgGasPriceInit = calculateAvgGasPrice(allNodesInit);
    const lastBlockInit = calculateLastBlockTime(allNodesInit);
    
    const statsInit = {
      bestBlock: { value: bestBlockInit },
      activeNodes: { value: allNodesInit.length },
      avgBlockTime: { value: avgBlockTimeInit },
      difficulty: { value: Math.round(totalDifficultyInit) },
      avgNetworkHashrate: { value: Math.round(totalHashrateInit), unit: 'H/s' },
      uncles: { value: totalUnclesInit },
      gasPrice: { value: avgGasPriceInit },
      gasLimit: { value: 8000000 },
      lastBlock: { value: lastBlockInit }
    };
  const initData = { action: 'init', data: { nodes: nodesInit, stats: statsInit } };
  spark.write(initData);
  spark.write(initData);
  
  // Also test a manual ping right after init data for actual latency measurement
  setTimeout(() => {
    if (spark.id && !spark.destroyed) {
      const serverTime = Date.now();
      try {
        spark.write({ action: 'client-ping', data: { serverTime } });
      } catch (error) {
        console.error('Error sending immediate ping:', error);
      }
    } else {
      console.log('Cannot test immediate ping - connection not ready:', spark.id, spark.destroyed);
    }
  }, 1000); // Wait 1 second for init to complete
  Nodes.getCharts();
  // Handle incoming ping-pong messages for latency measurement
  spark.on('data', (message) => {
    // Handle client-pong responses
    if (message && (message.action === 'client-pong' || message.event === 'client-pong') && message.data) {
      const currentTime = Date.now();
      const originalPingTime = message.data.serverTime;
      
      if (originalPingTime) {
        // Calculate round-trip latency (divide by 2 for one-way)
        const latency = Math.ceil((currentTime - originalPingTime) / 2);
        
        // Send latency back to client
        spark.write({
          action: 'client-latency',
          data: { latency: latency }
        });
        
      }
    }
  });
  
  // Monitor connection status events
  spark.on('open', () => {
    console.log('Spark connection opened, readyState:', spark.readyState);
  });
  
  spark.on('close', () => {
    console.log('Spark connection closed');
  });
  
  spark.on('error', (err) => {
    console.log('Spark connection error:', err.message);
  });
});

// Independent ping-pong system for latency measurement
setInterval(() => {
  
  // Count active connections using clientPrimus.forEach
  let connectionCount = 0;
  clientPrimus.forEach((spark) => {
    if (spark && spark.id && !spark.destroyed) {
      connectionCount++;
      // Reset pingCompleted flag periodically to allow new pings
      spark.pingCompleted = false;
    }
  });
  
  
  if (connectionCount === 0) {
    return;
  }
  
  let sentCount = 0;
  clientPrimus.forEach((spark) => {
    // Ignore readyState for testing - send to all non-destroyed connections
    const isConnected = spark && spark.id && !spark.destroyed;
    
    if (isConnected && !spark.pingCompleted) {
      try {
        const serverTime = Date.now(); // Millisecond precision timestamp for unified timing
        
        // Send ping regardless of readyState for testing
        spark.write({ action: 'client-ping', data: { serverTime } });
        
        sentCount++;
        
        // Mark as pinged to avoid duplicate pings, and auto-reset after some time
        spark.pingCompleted = true;
        setTimeout(() => {
          if (spark && !spark.destroyed) {
            spark.pingCompleted = false;
          }
        }, 8000); // Reset after 8 seconds to allow new pings
      } catch (error) {
        console.error('Error sending ping to client:', error);
      }
    } else if (spark && spark.pingCompleted) {
      console.log('Skipping ping for client (recently completed ping-pong)');
    } else {
      console.log('Skipping ping for client (not connected or destroyed)');
    }
  });
  console.log('Sent independent ping to', sentCount, 'clients');
}, 10000); // Changed to 10 seconds for testing

// Cleanup interval
setInterval(() => {
  const allNodes = Nodes.all();
  const nodesData = allNodes.map(node => ({
    id: node.id,
    name: node.info?.name || node.id,
    type: node.info?.type || node.info?.client || 'unknown',
    geo: node.geo || null, // Include geo information
    latitude: node.latitude || null, // Include latitude from geoip
    longitude: node.longitude || null, // Include longitude from geoip
    latency: node.stats?.latency || 0,
    mining: node.stats?.mining || false,
    peers: node.stats?.peers || 0,
    pending: node.stats?.pending || 0,
    block: node.stats?.block?.number || 0,
    blockHash: node.stats?.block?.hash || '',
    totalDifficulty: node.stats?.block?.totalDifficulty || 0,
    transactions: node.stats?.block?.transactions?.length || 0,
    uncles: node.stats?.block?.uncles?.length || 0,
    lastBlockTime: calculateNodeBlockTime(node), // Individual node block time in seconds ago
    propagation: node.stats?.block?.propagation || 0,
    propagationAvg: node.stats?.propagationAvg || 0,
    uptime: node.stats?.uptime ? 
      (typeof node.stats.uptime === 'number' ? 
        { lastStatus: node.stats.uptime } : 
        node.stats.uptime
      ) : 
      (node.uptime || { up: 0, down: 0, lastStatus: 100 })
  }));
  
  // Calculate network statistics from actual data
  const activeNodes = allNodes.filter(node => node.stats?.active || node.id);
  const bestBlock = calculateBestBlock(allNodes); // Use consistent bestBlock calculation
  
  // Calculate actual network statistics
  const avgBlockTime = calculateAvgBlockTime(allNodes);
  const totalDifficulty = calculateDifficulty(allNodes);
  const totalHashrate = calculateAvgHashrate(totalDifficulty, avgBlockTime);
  
  const totalUncles = activeNodes.reduce((sum, node) => sum + (node.stats?.block?.uncles?.length || 0), 0);
  const avgGasPrice = calculateAvgGasPrice(allNodes);
  const lastBlock = calculateLastBlockTime(allNodes);
  
  const stats = {
    bestBlock: { value: bestBlock },
    activeNodes: { value: allNodes.length },
    avgBlockTime: { value: avgBlockTime },
    difficulty: { value: totalDifficulty },
    avgNetworkHashrate: { value: totalHashrate, unit: 'H/s' },
    uncles: { value: totalUncles },
    gasPrice: { value: avgGasPrice },
    gasLimit: { value: 8000000 },
    lastBlock: { value: lastBlock }
  };
  
  clientPrimus.forEach((spark) => {
    spark.write({ action: 'init', data: { nodes: nodesData, stats: stats } });
  });
  Nodes.getCharts();
}, 3600000);

// Independent ping system for continuous latency measurement
setInterval(() => {
  if (clientPrimus.length > 0) {
    console.log(`\n=== Independent Ping System ===`);
    console.log(`Active client connections for ping: ${clientPrimus.length}`);
    
    clientPrimus.forEach((spark) => {
      console.log(`Connection ${spark.id}: destroyed=${spark.destroyed}`);
      console.log(`  readyState=${spark.readyState}, address=${spark.address.ip}, port=${spark.address.port}`);
      
      if (spark && !spark.destroyed) {
        const serverTime = Date.now(); // Millisecond precision timestamp for unified timing
        console.log(`Sending independent ping with serverTime: ${serverTime}`);
        
        try {
          console.log(`Attempting to write ping to spark with ID: ${spark.id}`);
          console.log(`Spark readyState: ${spark.readyState}`);
          spark.write({ action: 'client-ping', data: { serverTime } });
          console.log(`✅ Ping sent successfully, waiting for pong response...`);
          
        } catch (error) {
          console.error(`❌ Error sending independent ping to spark ${spark.id}:`, error);
        }
      } else {
        console.log(`Client ${spark.id} is destroyed or null, skipping ping`);
      }
    });
    
    console.log(`Sent independent ping to ${clientPrimus.length} clients`);
  } else {
    console.log('No clients connected for independent ping system');
  }
}, 10000); // Send ping every 10 seconds

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
