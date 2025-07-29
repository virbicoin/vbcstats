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
      zoom: 1,
      zoomControl: true,
      attributionControl: false,
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

        // Add popup with node information
        const popupContent = `
          <div style="background: #1f2937; color: #f3f4f6; padding: 8px; border-radius: 4px; min-width: 150px;">
            <h4 style="margin: 0 0 8px 0; color: #f59e0b; font-size: 14px;">${node.name}</h4>
            <div style="font-size: 12px; line-height: 1.4;">
              <div>Type: ${node.type || 'Unknown'}</div>
              <div>Mining: ${node.mining ? 'Yes' : 'No'}</div>
              ${node.peers ? `<div>Peers: ${node.peers}</div>` : ''}
              <div style="margin-top: 4px; color: #9ca3af;">
                ${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'dark-popup',
          closeButton: true,
          autoPan: true,
        });
      }
    });

    // Fit map to show all nodes if any exist
    if (validNodes.length > 0) {
      const group = new L.FeatureGroup(
        validNodes.map(node => 
          L.marker([node.latitude!, node.longitude!])
        )
      );
      map.fitBounds(group.getBounds().pad(0.1));
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
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
        }
        
        .dark-popup .leaflet-popup-tip {
          background: #1f2937 !important;
          border: 1px solid #374151 !important;
        }
        
        .dark-popup .leaflet-popup-close-button {
          color: #9ca3af !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
        
        .dark-popup .leaflet-popup-close-button:hover {
          color: #f3f4f6 !important;
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