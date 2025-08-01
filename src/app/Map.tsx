"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Node {
  id: string | number;
  name: string;
  latitude?: number;
  longitude?: number;
  type?: string;
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
  latency?: string | number | { id: string; latency: string };
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    ll?: [number, number];
    [key: string]: unknown;
  } | null;
}

interface MapProps {
  nodes: Node[];
}

const Map: React.FC<MapProps> = ({ nodes }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<globalThis.Map<string | number, L.Marker>>(new globalThis.Map());
  
  // Track node states to prevent unnecessary marker updates
  const nodeStatesRef = useRef<globalThis.Map<string | number, {
    mining: boolean;
    block: number;
    hash: string;
    city?: string;
    country?: string;
  }>>(new globalThis.Map());

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Capture ref values at the start of the effect
    const markersMap = markersRef.current;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [1.5, 0], // London (51.5°N) minus 50° = 1.5°N
      zoom: 1,
      zoomControl: false,
      attributionControl: false,
      // Disable automatic animations and interactions that could cause unwanted movement
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      // Allow manual zoom/pan but prevent automatic behavior
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
    });

    // Dark mode tile layer using CartoDB Dark Matter
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 10
    }).addTo(map);

    mapRef.current = map;

    return () => {
      // Use the captured ref values to avoid ref mutation warning
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const existingMarkers = markersRef.current;

    // Get valid nodes with coordinates
    const validNodes = nodes.filter(node => 
      node.latitude !== undefined && 
      node.longitude !== undefined &&
      !isNaN(node.latitude) && 
      !isNaN(node.longitude)
    );

    // Get current node IDs
    const currentNodeIds = new Set(validNodes.map(node => node.id));
    
    // Remove markers for nodes that no longer exist
    existingMarkers.forEach((marker, nodeId) => {
      if (!currentNodeIds.has(nodeId)) {
        map.removeLayer(marker);
        existingMarkers.delete(nodeId);
      }
    });

    // Helper function to get stable node information
    const getNodeInfo = (node: Node) => {
      return {
        name: node.name || 'Unknown Node',
        type: node.type || 'Unknown',
        mining: Boolean(node.mining),
        peers: node.peers || 0,
        pending: node.pending || 0,
        block: node.block,
        lastBlockTime: node.lastBlockTime,
        transactions: node.transactions,
        latency: node.latency,
        uptime: node.uptime,
        propagation: node.propagation,
        blockHash: node.blockHash,
        latitude: node.latitude,
        longitude: node.longitude,
        city: node.geo?.city,
        country: node.geo?.country
      };
    };

    // Custom marker icons based on node type
    const createCustomIcon = (node: Node) => {
      const color = node.mining ? '#f59e0b' : '#06b6d4';
      const size = 8;
      
      return L.divIcon({
        className: 'custom-node-marker',
        html: `
          <div style="
            background: ${color};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 2px solid #1f2937;
            box-shadow: 0 0 ${size}px rgba(${color === '#f59e0b' ? '245, 158, 11' : '6, 182, 212'}, 0.6);
          "></div>
        `,
        iconSize: [size + 4, size + 4],
        iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      });
    };

    // Create popup content function
    const createPopupContent = (nodeInfo: ReturnType<typeof getNodeInfo>) => {
      const locationText = nodeInfo.city && nodeInfo.country 
        ? `${nodeInfo.city}, ${nodeInfo.country}`
        : nodeInfo.country 
        ? nodeInfo.country
        : nodeInfo.city 
        ? nodeInfo.city
        : 'Unknown Location';

      return `
        <div style="background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 8px; min-width: 150px; max-width: 200px; font-family: system-ui, -apple-system, sans-serif; border: 1px solid #374151; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);">
          <div style="font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 6px; text-align: center;">
            ${nodeInfo.name}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; text-align: center;">
            📍 ${locationText}
          </div>
          ${nodeInfo.block ? `
          <div style="font-size: 12px; color: #9ca3af; text-align: center;">
            Block #${nodeInfo.block.toLocaleString()}
          </div>
          ` : ''}
        </div>
      `;
    };

    // Update or create markers for each valid node
    validNodes.forEach(node => {
      if (!node.latitude || !node.longitude) return;

      const nodeInfo = getNodeInfo(node);
      const existingMarker = existingMarkers.get(node.id);
      
      // Track current node state
      const currentState: {
        mining: boolean;
        block: number;
        hash: string;
        city?: string;
        country?: string;
      } = {
        mining: nodeInfo.mining,
        block: nodeInfo.block || 0,
        hash: nodeInfo.blockHash || '',
        ...(nodeInfo.city && { city: nodeInfo.city }),
        ...(nodeInfo.country && { country: nodeInfo.country })
      };
      
      const previousState = nodeStatesRef.current.get(node.id);
      const stateChanged = !previousState || 
        previousState.mining !== currentState.mining ||
        previousState.block !== currentState.block ||
        previousState.hash !== currentState.hash ||
        previousState.city !== currentState.city ||
        previousState.country !== currentState.country;

      if (existingMarker) {
        // Update existing marker position if needed
        const currentLatLng = existingMarker.getLatLng();
        if (currentLatLng.lat !== node.latitude || currentLatLng.lng !== node.longitude) {
          existingMarker.setLatLng([node.latitude, node.longitude]);
        }

        // Only update marker icon and popup if state actually changed
        if (stateChanged) {
          existingMarker.setIcon(createCustomIcon(node));
          existingMarker.setPopupContent(createPopupContent(nodeInfo));
          nodeStatesRef.current.set(node.id, currentState);
        }
      } else {
        // Create new marker
        const marker = L.marker([node.latitude, node.longitude], {
          icon: createCustomIcon(node)
        }).addTo(map);

        // Set popup content
        marker.bindPopup(createPopupContent(nodeInfo), {
          className: 'simple-popup',
          closeButton: false,
          autoPan: false,
          maxWidth: 200,
          minWidth: 150,
          offset: [0, -10]
        });

        // Add click event
        marker.on('click', function(this: L.Marker) {
          this.openPopup();
        });

        // Store marker reference and state
        existingMarkers.set(node.id, marker);
        nodeStatesRef.current.set(node.id, currentState);
      }
    });

    // Disabled to prevent unwanted map movement
    // const isInitialLoad = validNodes.length > 0 && existingMarkers.size <= validNodes.length;
    // if (isInitialLoad && validNodes.length === existingMarkers.size) {
    //   const group = new L.FeatureGroup(
    //     validNodes.map(node => 
    //       L.marker([node.latitude!, node.longitude!])
    //     )
    //   );
    //   map.fitBounds(group.getBounds().pad(0.1), { animate: false });
    // }

  }, [nodes]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-gray-900 rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Node count overlay */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 z-[1000]">
        <div className="text-sm text-gray-300">
          <span className="text-cyan-400">{nodes.length}</span> nodes connected
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {nodes.filter(n => n.latitude && n.longitude).length} geolocated
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 z-[1000]">
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 border border-gray-700"></div>
            <span>Mining Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 border border-gray-700"></div>
            <span>Regular Node</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .simple-popup .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
          padding: 0 !important;
          max-width: 200px !important;
          min-width: 150px !important;
        }
        
        .simple-popup .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          background: #1f2937 !important;
          border-radius: 8px !important;
        }
        
        .simple-popup .leaflet-popup-tip {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        
        .custom-node-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default Map;

