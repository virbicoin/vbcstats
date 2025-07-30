"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { FaCube, FaLayerGroup, FaClock, FaStopwatch, FaSignal, FaHashtag, FaUsers, FaMoneyBillWave } from "react-icons/fa";
import dynamic from "next/dynamic";

// GeoIP-lite import for server-side IP geolocation
// Note: This will only work on the server side, so we'll use a different approach for client-side

// 型定義ファイルがないモジュールの宣言（未使用）
// declare const Primus: new (url: string) => {
//   on: (event: string, callback: (data?: unknown) => void) => void;
//   emit: (event: string, data?: unknown) => void;
//   write: (data: unknown) => void;
// };

const Charts = dynamic(() => import('./components/Charts').then(mod => ({ default: mod.default })), {
  loading: () => <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center"><p className="text-gray-400">Loading Chart...</p></div>,
  ssr: false,
});

const Nodes = dynamic(() => import('./components/Nodes'), {
  loading: () => <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center"><p className="text-gray-400">Loading Nodes...</p></div>,
  ssr: false,
});

interface Node {
  id: string | number;
  name: string;
  type?: string;
  info?: {
    name?: string;
    type?: string;
    ip?: string;
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
}

interface StatsValue {
  value: number | string | { lastStatus?: number; up?: number; down?: number };
  unit?: string;
}

interface StatsData { 
  [id: string]: StatsValue;
}

// サードパーティのライブラリでany型が必要な場合に使用（未使用）
// const safeDisplayValue = (value: any): string => {
//   if (value === undefined || value === null) return '--';
//   if (typeof value === 'object') {
//     if (value.value !== undefined) return String(value.value);
//     return JSON.stringify(value);
//   }
//   return String(value);
// };

const formatNumber = (value: number): string => {
  if (value === 0) return '0.00';
  if (value < 1) return value.toFixed(6);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Convert wei to gwei (divide by 1e9)
const weiToGwei = (wei: number): number => {
  return wei / 1000000000;
};

// Format large numbers with proper units
const formatLargeNumber = (value: number): string => {
  if (value === 0) return '0';
  if (value >= 1e18) return (value / 1e18).toFixed(2) + ' E';
  if (value >= 1e15) return (value / 1e15).toFixed(2) + ' P';
  if (value >= 1e12) return (value / 1e12).toFixed(2) + ' T';
  if (value >= 1e9) return (value / 1e9).toFixed(2) + ' G';
  if (value >= 1e6) return (value / 1e6).toFixed(2) + ' M';
  if (value >= 1e3) return (value / 1e3).toFixed(2) + ' K';
  return value.toLocaleString();
};

function HomePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [stats, setStats] = useState<StatsData>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState("");
  const [lastBlockTime, setLastBlockTime] = useState<number>(0);
  const [pageLatency, setPageLatency] = useState<number>(0);
  const [latencyRetryCount, setLatencyRetryCount] = useState<number>(0);
  const [lastValidLatency, setLastValidLatency] = useState<number>(0);
  
  // Store node coordinates persistently to prevent position changes
  const nodeCoordinatesRef = useRef(new globalThis.Map<string | number, { latitude: number; longitude: number }>());
  // Store IP to coordinates cache to avoid repeated API calls
  const ipCoordinatesCache = useRef(new globalThis.Map<string, { latitude: number; longitude: number; timestamp: number }>());

  // Function to extract IP address from node name or ID (based on original vbcstats implementation)
  const extractIPFromNode = (node: Node): string | null => {
    // Check if node info contains IP directly
    if (node.name && typeof node.name === 'string') {
      // First try to extract from node name
      const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
      const match = node.name.match(ipRegex);
      if (match) return match[1];
      
      // Try to extract from hostname format like "node-123.456.789.012"
      const hostnameRegex = /node[.-](\d{1,3})[.-](\d{1,3})[.-](\d{1,3})[.-](\d{1,3})/i;
      const hostnameMatch = node.name.match(hostnameRegex);
      if (hostnameMatch) {
        return `${hostnameMatch[1]}.${hostnameMatch[2]}.${hostnameMatch[3]}.${hostnameMatch[4]}`;
      }
    }
    
    // Try to extract IP from node ID if it's a string
    if (typeof node.id === 'string') {
      const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
      const match = node.id.match(ipRegex);
      if (match) return match[1];
    }
    
    // Look for any IP-like patterns in other node properties
    const nodeStr = JSON.stringify(node);
    const ipRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
    const matches = nodeStr.match(ipRegex);
    if (matches && matches.length > 0) {
      // Return the first valid-looking IP address
      for (const ip of matches) {
        const parts = ip.split('.');
        if (parts.every(part => parseInt(part) <= 255)) {
          return ip;
        }
      }
    }
    
    return null;
  };

  // Function to get coordinates from IP using direct geoip-lite call via API
  const getCoordinatesFromIP = async (ip: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Check cache first (cache for 24 hours)
      const cached = ipCoordinatesCache.current.get(ip);
      const now = Date.now();
      if (cached && (now - cached.timestamp) < 24 * 60 * 60 * 1000) {
        console.log(`Using cached coordinates for IP ${ip}:`, cached.latitude, cached.longitude);
        return { latitude: cached.latitude, longitude: cached.longitude };
      }

      // Skip private IP addresses and IPv6-mapped IPv4 addresses
      let cleanIp = ip;
      if (ip.substr(0, 7) === "::ffff:") {
        cleanIp = ip.substr(7);
      }
      
      const privateIpRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|0\.0\.0\.0|255\.255\.255\.255)/;
      if (privateIpRegex.test(cleanIp)) {
        console.log(`Skipping private IP address: ${cleanIp}`);
        return null;
      }

      // Make API request to our GeoIP endpoint
      const response = await fetch(`/api/geoip?ip=${encodeURIComponent(cleanIp)}`);
      if (!response.ok) {
        console.warn(`GeoIP API request failed for ${cleanIp}:`, response.status);
        return null;
      }

      const data = await response.json();
      if (data.latitude !== undefined && data.longitude !== undefined && 
          !isNaN(data.latitude) && !isNaN(data.longitude)) {
        const coords = { latitude: data.latitude, longitude: data.longitude };
        // Cache the result
        ipCoordinatesCache.current.set(ip, {
          ...coords,
          timestamp: now
        });
        console.log(`Got coordinates from GeoIP for ${cleanIp} (${data.city || 'Unknown'}, ${data.country || 'Unknown'}):`, data.latitude, data.longitude);
        return coords;
      }
      
      console.warn(`Invalid location data from GeoIP for ${cleanIp}:`, data);
      return null;
    } catch (error) {
      console.error(`Error fetching coordinates for IP ${ip}:`, error);
      return null;
    }
  };

  // Function to add stable coordinates to nodes based on server data or IP
  const addCoordinatesToNodes = useCallback(async (nodesList: Node[]): Promise<Node[]> => {
    console.log('Processing nodes for coordinates:', nodesList.length, 'nodes');
    console.log('Current stored coordinates count:', nodeCoordinatesRef.current.size);
    
    const processedNodes = await Promise.all(nodesList.map(async (node) => {
      // Priority 1: If node has geo.ll data from server (geoip-lite), use it
      if (node.geo?.ll && Array.isArray(node.geo.ll) && node.geo.ll.length === 2) {
        const coords = {
          latitude: node.geo.ll[0],
          longitude: node.geo.ll[1]
        };
        // Store in persistent map for future reference
        nodeCoordinatesRef.current.set(node.id, coords);
        console.log(`Node ${node.id} (${node.name}) has server geo coordinates:`, coords.latitude, coords.longitude);
        return {
          ...node,
          ...coords
        };
      }
      
      // Priority 2: If node already has coordinates from server, use them
      if (node.latitude && node.longitude) {
        // Store in persistent map for future reference
        nodeCoordinatesRef.current.set(node.id, { 
          latitude: node.latitude, 
          longitude: node.longitude 
        });
        console.log(`Node ${node.id} (${node.name}) has server coordinates:`, node.latitude, node.longitude);
        return node;
      }
      
      // Priority 3: Check if we have stored coordinates for this node
      const storedCoords = nodeCoordinatesRef.current.get(node.id);
      if (storedCoords) {
        console.log(`Node ${node.id} (${node.name}) using stored coordinates:`, storedCoords.latitude, storedCoords.longitude);
        return {
          ...node,
          latitude: storedCoords.latitude,
          longitude: storedCoords.longitude,
        };
      }
      
      // Priority 4: Try to get coordinates from IP address if available
      const ip = extractIPFromNode(node);
      if (ip) {
        try {
          const coords = await getCoordinatesFromIP(ip);
          if (coords) {
            // Store coordinates for future use
            nodeCoordinatesRef.current.set(node.id, coords);
            console.log(`Node ${node.id} (${node.name}) got GeoIP-based coordinates for ${ip}:`, coords.latitude, coords.longitude);
            return {
              ...node,
              ...coords,
            };
          }
        } catch (error) {
          console.error(`Failed to get coordinates for IP ${ip}:`, error);
        }
      }
      
      // Fallback: Generate stable coordinates based on node ID (smaller spread)
      const cityCoordinates = [
        { lat: 35.6762, lng: 139.6503 }, // Tokyo
        { lat: 40.7128, lng: -74.0060 }, // New York
        { lat: 51.5074, lng: -0.1278 },  // London
        { lat: 48.8566, lng: 2.3522 },   // Paris
        { lat: 52.5200, lng: 13.4050 },  // Berlin
        { lat: 37.7749, lng: -122.4194 }, // San Francisco
        { lat: 55.7558, lng: 37.6176 },  // Moscow
        { lat: 22.3193, lng: 114.1694 }, // Hong Kong
        { lat: 1.3521, lng: 103.8198 },  // Singapore
        { lat: -33.8688, lng: 151.2093 }, // Sydney
      ];
      
      // Create a simple hash from node ID for consistent positioning
      const nodeIdString = String(node.id);
      let hash = 0;
      for (let i = 0; i < nodeIdString.length; i++) {
        const char = nodeIdString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      // Use hash to select city and create consistent variation
      const cityIndex = Math.abs(hash) % cityCoordinates.length;
      const selectedCity = cityCoordinates[cityIndex];
      
      // Create smaller consistent variation based on hash (reduced from ±5 to ±1 degrees)
      const latVariation = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 1; // -0.5 to +0.5 degrees
      const lngVariation = ((Math.abs(hash >> 16) % 1000) / 1000 - 0.5) * 1; // -0.5 to +0.5 degrees
      
      const newCoords = {
        latitude: selectedCity.lat + latVariation,
        longitude: selectedCity.lng + lngVariation,
      };
      
      // Store coordinates for future use
      nodeCoordinatesRef.current.set(node.id, newCoords);
      console.log(`Node ${node.id} (${node.name}) generated fallback coordinates:`, newCoords.latitude, newCoords.longitude);
      
      return {
        ...node,
        ...newCoords,
      };
    }));

    return processedNodes;
  }, []);

  // Last Block timer - increments every second
  useEffect(() => {
    const timer = setInterval(() => {
      setLastBlockTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Reset last block time when new block arrives
  useEffect(() => {
    const bestBlockValue = stats['bestBlock']?.value;
    if (bestBlockValue && typeof bestBlockValue === 'number' && bestBlockValue > 0) {
      setLastBlockTime(0);
    }
  }, [stats]);

  // Reset latency retry count periodically
  useEffect(() => {
    const retryTimer = setInterval(() => {
      setLatencyRetryCount(prev => {
        if (prev > 0) {
          console.log('Resetting latency retry count from', prev, 'to', Math.max(0, prev - 1));
          return Math.max(0, prev - 1);
        }
        return prev;
      });
    }, 30000); // Reset one retry count every 30 seconds

    return () => clearInterval(retryTimer);
  }, []);

  useEffect(() => {
    // Determine the appropriate server URL based on environment
    const customWsUrl = process.env['NEXT_PUBLIC_WS_URL'];
    const isProduction = process.env.NODE_ENV === 'production';
    const serverPort = process.env['NEXT_PUBLIC_SERVER_PORT'] || '5000';
    
    // Use custom WS URL if provided, otherwise determine based on environment
    let baseUrl: string;
    let wsUrl: string;
    
    if (isProduction) {
      // In production, always use HTTPS for script loading
      baseUrl = 'https://stats.digitalregion.jp';
      // For WebSocket, use the custom URL if provided, otherwise default to WSS
      if (customWsUrl) {
        wsUrl = customWsUrl;
      } else {
        wsUrl = 'wss://stats.digitalregion.jp';
      }
    } else {
      // Development environment - use HTTP for both script and WebSocket
      baseUrl = `http://localhost:${serverPort}`;
      wsUrl = `ws://localhost:${serverPort}`;
    }
    
    // Load Primus client library from server
    const script = document.createElement('script');
    script.src = `${baseUrl}/primus/primus.js`;
    script.onload = () => {
      console.log('Primus library loaded from:', baseUrl);
      
      // Check if Primus is available
      if (!(window as unknown as { Primus?: unknown }).Primus) {
        console.error('Primus library not found after loading');
        setErrorStats('Failed to load Primus WebSocket library');
        return;
      }
      
      try {
        const PrimusConstructor = (window as unknown as { Primus: new (url: string) => unknown }).Primus;
        const primus = new PrimusConstructor(wsUrl) as {
          on: (event: string, callback: (data?: unknown) => void) => void;
          emit?: (event: string, data?: unknown) => void;
          write?: (data: unknown) => void;
        };

        primus.on('open', () => {
          console.log('WebSocket connection opened to:', wsUrl);
          setErrorStats("");
          // Small delay to ensure connection is fully established
          setTimeout(() => {
            try {
              if (typeof primus.emit === 'function') {
                primus.emit('ready');
              } else if (typeof primus.write === 'function') {
                primus.write({ action: 'ready' });
              }
              console.log('Ready event sent to server');
            } catch (err) {
              console.error('Failed to send ready event:', err);
            }
          }, 100);
        });

        primus.on('error', (err: unknown) => {
          console.error('WebSocket error:', err);
          const errorMessage = typeof err === 'object' && err !== null && 'message' in err 
            ? (err as { message: string }).message 
            : String(err);
          setErrorStats(`WebSocket Error: ${errorMessage}`);
        });

        primus.on('close', () => {
          console.log('WebSocket connection closed');
          setErrorStats('WebSocket connection closed');
        });

        primus.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setErrorStats('WebSocket disconnected - trying to reconnect...');
        });

      primus.on('data', async (message: unknown) => {
        const typedMessage = message as { 
          action?: string; 
          data?: {
            nodes?: Node[];
            stats?: StatsData;
            id?: string | number;
            serverTime?: number;
            latency?: number;
          };
        };
        console.log('WebSocket data received:', typedMessage.action, typedMessage);
        if (typedMessage.action === 'init' && typedMessage.data) {
          console.log('Processing init data:', typedMessage.data);
          const nodesWithCoords = await addCoordinatesToNodes(typedMessage.data.nodes || []);
          setNodes(nodesWithCoords);
          setStats(typedMessage.data.stats || {});
          setLoadingStats(false);
          setLastBlockTime(0); // Reset timer on new data
          console.log('Init data processed, nodes:', nodesWithCoords.length, 'stats keys:', Object.keys(typedMessage.data.stats || {}));
        } else if (typedMessage.action === 'update' && typedMessage.data) {
          // Update individual node stats but keep network stats
          if (typedMessage.data.id && typedMessage.data.stats) {
            setNodes(prev => prev.map(node => 
              node.id === typedMessage.data!.id ? { ...node, ...typedMessage.data } : node
            ));
          }
        } else if (typedMessage.action === 'block' && typedMessage.data) {
          // Handle block updates - refresh all data (both nodes and stats will be updated)
          if (typedMessage.data.nodes && typedMessage.data.stats) {
            const nodesWithCoords = await addCoordinatesToNodes(typedMessage.data.nodes);
            setNodes(nodesWithCoords);
            setStats(typedMessage.data.stats);
            setLastBlockTime(0); // Reset timer on new block
          } else if (typedMessage.data.id) {
            setNodes(prev => prev.map(node => 
              node.id === typedMessage.data!.id ? { ...node, ...typedMessage.data } : node
            ));
            setLastBlockTime(0); // Reset timer on new block
          }
        } else if (typedMessage.action === 'stats' && typedMessage.data) {
          // Handle stats updates - refresh all data
          if (typedMessage.data.nodes && typedMessage.data.stats) {
            const nodesWithCoords = await addCoordinatesToNodes(typedMessage.data.nodes);
            setNodes(nodesWithCoords);
            setStats(typedMessage.data.stats);
          } else if (typedMessage.data.id && typedMessage.data.stats) {
            setNodes(prev => prev.map(node => 
              node.id === typedMessage.data!.id ? { ...node, ...typedMessage.data!.stats } : node
            ));
          }
        } else if (typedMessage.action === 'charts' && typedMessage.data) {
          // Handle charts data if needed
        } else if (typedMessage.action === 'client-ping' && typedMessage.data) {
          // Handle server ping - send pong back with the server time
          const currentTime = Date.now();
          const pongData = {
            serverTime: typedMessage.data.serverTime,
            clientTime: currentTime
          };
          let pongSent = false;
          // Method 1: Try write method first (most reliable for Primus)
          try {
            if (typeof primus.write === 'function') {
              primus.write({
                action: 'client-pong',
                data: pongData
              });
              pongSent = true;
            }
          } catch {
            // Error ignored intentionally
          }
          // Method 2: Try emit method as backup if write failed
          if (!pongSent) {
            try {
              if (typeof primus.emit === 'function') {
                primus.emit('client-pong', pongData);
                pongSent = true;
              }
            } catch {
              // Error ignored intentionally
            }
          }
          // Update retry count based on success
          if (pongSent) {
            setLatencyRetryCount(0);
          } else {
            setLatencyRetryCount(prev => prev + 1);
          }
        } else if (typedMessage.action === 'client-latency' && typedMessage.data) {
          if (typedMessage.data.latency !== undefined && typedMessage.data.latency > 0) {
            const newLatency = Math.round(typedMessage.data.latency);
            // Update both state variables
            setPageLatency(newLatency);
            setLastValidLatency(newLatency);
            setStats(prevStats => ({
              ...prevStats,
              pageLatency: {
                value: newLatency,
                unit: 'ms'
              }
            }));
            // Reset retry count on successful latency update
            setLatencyRetryCount(0);
          } else {
            setLatencyRetryCount(prev => prev + 1);
          }
        }
      });

      primus.on('error', () => {
        setErrorStats("Connection error");
      });

      } catch (err) {
        console.error('Failed to initialize Primus:', err);
        setErrorStats("Failed to initialize Primus");
      }
    };

    script.onerror = () => {
      setErrorStats("Failed to load Primus");
    };

    script.onerror = (error) => {
      console.error('Failed to load Primus library from:', baseUrl, error);
      setErrorStats(`Failed to load WebSocket library from ${baseUrl}`);
      setLoadingStats(false);
    };
    
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
   
  }, [addCoordinatesToNodes]);

  const statCards = [
    { id: 'bestBlock', icon: <FaCube className="text-blue-400" />, label: "Best Block" },
    { id: 'uncles', icon: <FaLayerGroup className="text-purple-400" />, label: "Uncles" },
    { id: 'lastBlock', icon: <FaClock className="text-green-400" />, label: "Last Block" },
    { id: 'avgBlockTime', icon: <FaStopwatch className="text-orange-400" />, label: "Avg Block Time" },
    { id: 'avgNetworkHashrate', icon: <FaSignal className="text-cyan-400" />, label: "Avg Network Hashrate" },
    { id: 'difficulty', icon: <FaHashtag className="text-red-400" />, label: "Difficulty" },
  ];

  const formatStatValue = (card: { id: string }) => {
    if (loadingStats) return '--';
    if (errorStats || !stats[card.id]) return '!';

    const stat = stats[card.id];
    if (stat === undefined || stat.value === undefined) return '--';

    if (card.id === 'uptime' && typeof stat.value === 'object' && stat.value !== null) {
      if (stat.value.lastStatus !== undefined) {
        return `${Number(stat.value.lastStatus).toFixed(2)}%`;
      }
      if (stat.value.up !== undefined && stat.value.down !== undefined) {
        const total = stat.value.up + stat.value.down;
        const percentage = total > 0 ? (stat.value.up / total) * 100 : 0;
        return `${percentage.toFixed(2)}%`;
      }
      return '--';
    }

    switch (card.id) {
      case 'lastBlock':
        return `${lastBlockTime} s ago`;
      case 'avgBlockTime':
        // GVBC specific: 13 seconds block time
        const blockTime = Number(stat.value);
        return `${blockTime.toFixed(2)} s`;
      case 'avgNetworkHashrate':
        // GVBC specific: 4.3 GH/s
        const hashrate = Number(stat.value);
        return `${(hashrate / 1e9).toFixed(2)} GH/s`;
      case 'difficulty':
        // GVBC specific: 94 GH
        const difficulty = Number(stat.value);
        return `${(difficulty / 1e9).toFixed(2)} GH`;
      case 'gasPrice':
        // Convert wei to gwei
        const priceInGwei = weiToGwei(Number(stat.value));
        return `${formatNumber(priceInGwei)} Gwei`;
      case 'bestBlock':
      case 'activeNodes':
        return Number(stat.value).toLocaleString();
      case 'uncles':
        return Number(stat.value).toString();
      default:
        if (typeof stat.value === 'object' && stat.value !== null) {
          return JSON.stringify(stat.value);
        }
        return String(stat.value);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Main Content */}
      <main className="container-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {statCards.map((card) => (
            <div key={card.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition-colors">
              <div className="flex items-center justify-between mb-2">
                {React.cloneElement(card.icon, { className: "text-3xl " + card.icon.props.className })}
              </div>
              <div className="text-2xl font-bold text-white mb-1">{formatStatValue(card)}</div>
              <div className="text-sm text-gray-400 uppercase tracking-wide">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Additional Statistics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Nodes */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <FaUsers className="text-3xl text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {loadingStats ? '--' : errorStats || !stats['activeNodes'] ? '!' : Number(stats['activeNodes'].value).toLocaleString()}/{nodes.length}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">Active Nodes</div>
          </div>

          {/* Gas Price */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <FaMoneyBillWave className="text-3xl text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {loadingStats ? '--' : errorStats || !stats['gasPrice'] ? '!' : (() => {
                const priceInGwei = weiToGwei(Number(stats['gasPrice'].value));
                return `${formatNumber(priceInGwei)} Gwei`;
              })()}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">Gas Price</div>
          </div>

          {/* Gas Limit */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <FaSignal className="text-3xl text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {loadingStats ? '--' : errorStats || !stats['gasLimit'] ? '!' : formatLargeNumber(Number(stats['gasLimit'].value))}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">Gas Limit</div>
          </div>

          {/* Page Latency */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <FaClock className="text-3xl text-pink-400" />
              {latencyRetryCount > 2 && (
                <div className="text-xs text-yellow-400">
                  ⚠️ {latencyRetryCount}
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {(() => {
                // Priority order: stats > pageLatency > lastValidLatency > fallback
                if (stats['pageLatency']?.value && typeof stats['pageLatency'].value === 'number' && stats['pageLatency'].value > 0) {
                  return `${stats['pageLatency'].value} ms`;
                } else if (pageLatency > 0) {
                  return `${pageLatency} ms`;
                } else if (lastValidLatency > 0 && latencyRetryCount < 5) {
                  return `${lastValidLatency} ms*`;
                } else if (latencyRetryCount > 0) {
                  return `-- (retry: ${latencyRetryCount})`;
                } else {
                  return '--';
                }
              })()}
            </div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">
              Page Latency
              {lastValidLatency > 0 && latencyRetryCount > 0 && latencyRetryCount < 5 && (
                <span className="text-xs"> (*last known)</span>
              )}
            </div>
          </div>
        </div>

        {/* Charts and Visualizations */}
        <div className="mb-8">
          <Charts currentStats={stats} nodes={nodes} />
        </div>

        {/* Nodes Table */}
        <Nodes 
          nodes={nodes} 
          bestBlock={typeof stats['bestBlock']?.value === 'number' ? stats['bestBlock'].value : 0}
        />
      </main>
    </div>
  );
}

export default HomePage;
