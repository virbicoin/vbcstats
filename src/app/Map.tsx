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
}

interface MapProps {
  nodes: Node[];
}

const Map: React.FC<MapProps> = ({ nodes }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [35.0, 0],
      zoom: 2,
      zoomControl: true,
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add nodes with coordinates as markers
    const validNodes = nodes.filter(node => 
      node.latitude !== undefined && 
      node.longitude !== undefined &&
      !isNaN(node.latitude) && 
      !isNaN(node.longitude)
    );

    if (validNodes.length === 0) return;

    // Custom marker icons based on node type
    const createCustomIcon = (node: Node) => {
      const color = node.mining ? '#f59e0b' : '#06b6d4'; // Gold for mining, cyan for regular
      const size = node.mining ? 12 : 8;
      
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

    // Add markers for valid nodes
    validNodes.forEach(node => {
      if (node.latitude && node.longitude) {
        const marker = L.marker([node.latitude, node.longitude], {
          icon: createCustomIcon(node)
        }).addTo(map);

        // Add popup with detailed node information
        const formatLatency = (latency: string | number | { id: string; latency: string } | undefined) => {
          if (!latency) return 'N/A';
          if (typeof latency === 'object' && 'latency' in latency) {
            return latency.latency;
          }
          return `${latency} ms`;
        };

        const formatUptime = (uptime: { lastStatus?: number; up?: number; down?: number } | undefined) => {
          if (!uptime) return 'N/A';
          if (uptime.lastStatus !== undefined) {
            return `${Number(uptime.lastStatus).toFixed(2)}%`;
          }
          if (uptime.up !== undefined && uptime.down !== undefined) {
            const total = uptime.up + uptime.down;
            const percentage = total > 0 ? (uptime.up / total) * 100 : 0;
            return `${percentage.toFixed(2)}%`;
          }
          return 'N/A';
        };

        const popupContent = `
          <div style="background: #1f2937; color: #f3f4f6; padding: 12px; border-radius: 8px; min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${node.mining ? '#f59e0b' : '#06b6d4'}; box-shadow: 0 0 8px rgba(${node.mining ? '245, 158, 11' : '6, 182, 212'}, 0.6);"></div>
              <h4 style="margin: 0; color: #f59e0b; font-size: 16px; font-weight: 600;">${node.name}</h4>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; line-height: 1.4;">
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Type:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${node.type || 'Unknown'}</div>
              </div>
              
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Mining:</div>
                <div style="color: ${node.mining ? '#10b981' : '#ef4444'}; font-weight: 500;">${node.mining ? 'Active' : 'Inactive'}</div>
              </div>
              
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Peers:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${node.peers || '0'}</div>
              </div>
              
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Pending:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${node.pending || '0'}</div>
              </div>
              
              ${node.block ? `
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Block:</div>
                <div style="color: #3b82f6; font-weight: 500;">#${node.block.toLocaleString()}</div>
              </div>
              ` : ''}
              
              ${node.lastBlockTime ? `
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Last Block:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${node.lastBlockTime}s ago</div>
              </div>
              ` : ''}
              
              ${node.transactions ? `
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Transactions:</div>
                <div style="color: #10b981; font-weight: 500;">${node.transactions}</div>
              </div>
              ` : ''}
              
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Latency:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${formatLatency(node.latency)}</div>
              </div>
              
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Uptime:</div>
                <div style="color: #10b981; font-weight: 500;">${formatUptime(node.uptime)}</div>
              </div>
              
              ${node.propagation ? `
              <div>
                <div style="color: #9ca3af; margin-bottom: 2px;">Propagation:</div>
                <div style="color: #f3f4f6; font-weight: 500;">${node.propagation}ms</div>
              </div>
              ` : ''}
            </div>
            
            ${node.blockHash ? `
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #374151;">
              <div style="color: #9ca3af; margin-bottom: 2px; font-size: 12px;">Block Hash:</div>
              <div style="color: #6b7280; font-family: monospace; font-size: 11px; word-break: break-all;">${node.blockHash}</div>
            </div>
            ` : ''}
            
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #374151; font-size: 11px; color: #6b7280; text-align: center;">
              📍 ${node.latitude?.toFixed(4)}, ${node.longitude?.toFixed(4)}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'dark-popup',
          closeButton: true,
          autoPan: false, // Disable automatic panning to prevent unwanted map movement
          maxWidth: 300,
          minWidth: 250,
        });

        // Add click event for immediate popup opening (in addition to hover)
        marker.on('click', function(this: L.Marker) {
          this.openPopup();
        });
      }
    });

    // Fit map to show all nodes if any exist, but without animation
    if (validNodes.length > 0) {
      const group = new L.FeatureGroup(
        validNodes.map(node => 
          L.marker([node.latitude!, node.longitude!])
        )
      );
      // Fit bounds without animation to prevent unwanted automatic movement
      map.fitBounds(group.getBounds().pad(0.1), { animate: false });
    }

  }, [nodes]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full bg-gray-900 rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Node count overlay */}
      <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 z-[1000]">
        <div className="text-sm text-gray-300">
          <span className="text-cyan-400">{nodes.length}</span> nodes connected
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {nodes.filter(n => n.latitude && n.longitude).length} geolocated
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 z-[1000]">
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
        .dark-popup .leaflet-popup-content-wrapper {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.4) !important;
          padding: 0 !important;
        }
        
        .dark-popup .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .dark-popup .leaflet-popup-tip {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        
        .dark-popup .leaflet-popup-close-button {
          color: #9ca3af !important;
          font-size: 18px !important;
          font-weight: bold !important;
          padding: 8px !important;
          top: 8px !important;
          right: 8px !important;
        }
        
        .dark-popup .leaflet-popup-close-button:hover {
          color: #f3f4f6 !important;
          background: rgba(55, 65, 81, 0.5) !important;
          border-radius: 4px !important;
        }
        
        .custom-node-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-control-zoom {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
          border-radius: 6px !important;
        }
        
        .leaflet-control-zoom a {
          background: #1f2937 !important;
          color: #f3f4f6 !important;
          border: none !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: #374151 !important;
          color: #f59e0b !important;
        }
      `}</style>
    </div>
  );
};

export default Map;