'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface WorldMapProps {
  nodes?: Array<{
    id: string
    name: string
    lat: number
    lng: number
    active: boolean
  }>
  className?: string
}

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

const WorldMap: React.FC<WorldMapProps> = ({ nodes = [], className = "" }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Fix for default markers in react-leaflet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
  }, [])

  // Create custom icons for active and inactive nodes
  const activeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NiAwIDAgNS41OTYgMCAxMi41QzAgMTkuNDA0IDUuNTk2IDI1IDEyLjUgMjVDMTkuNDA0IDI1IDI1IDE5LjQwNCAyNSAxMi41QzI1IDUuNTk2IDE5LjQwNCAwIDEyLjUgMFoiIGZpbGw9IiMxMGI5ODEiLz4KPHBhdGggZD0iTTEyLjUgMzVMMjAgMjVIMTVDMTUgMjIuMjM4NiAxMi43NjE0IDIwIDEwIDIwQzcuMjM4NTggMjAgNSAyMi4yMzg2IDUgMjVIMFYzNUwxMi41IDM1WiIgZmlsbD0iIzEwYjk4MSIvPgo8L3N2Zz4K',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })

  const inactiveIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHZpZXdCb3g9IjAgMCAyNSA0MSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyLjUgMEM1LjU5NiAwIDAgNS41OTYgMCAxMi41QzAgMTkuNDA0IDUuNTk2IDI1IDEyLjUgMjVDMTkuNDA0IDI1IDI1IDE5LjQwNCAyNSAxMi41QzI1IDUuNTk2IDE5LjQwNCAwIDEyLjUgMFoiIGZpbGw9IiM2YjcyODAiLz4KPHBhdGggZD0iTTEyLjUgMzVMMjAgMjVIMTVDMTUgMjIuMjM4NiAxMi43NjE0IDIwIDEwIDIwQzcuMjM4NTggMjAgNSAyMi4yMzg2IDUgMjVIMFYzNUwxMi41IDM1WiIgZmlsbD0iIzZiNzI4MCIvPgo8L3N2Zz4K',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })

  if (!isClient) {
    return (
      <div className={`world-map-container bg-[#0d1421] rounded-lg border border-[#1e3a5f] p-4 ${className}`}>
        <div className="flex items-center mb-6">
          <span className="text-xl font-semibold text-gray-100">World Map</span>
        </div>
        <div className="h-32 bg-gray-700/30 rounded-lg flex items-center justify-center">
          <span className="text-gray-400">Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`world-map-container bg-[#0d1421] rounded-lg border border-[#1e3a5f] p-4 ${className}`}>
      <div className="relative">
        <MapContainer
          center={[35.0, 0.0]} // South of London coordinates
          zoom={1}
          style={{ height: '155px', width: '100%' }}
          className="rounded-lg"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            className="dark-tiles"
          />
          {nodes.map((node, index) => (
            <Marker
              key={index}
              position={[node.lat, node.lng]}
              icon={node.active ? activeIcon : inactiveIcon}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">{node.name}</div>
                  <div className="text-gray-600">ID: {node.id}</div>
                  <div className="text-gray-600">
                    Status: {node.active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="text-gray-600">
                    Location: {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-6 right-6 bg-[#0d1421]/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-[#1e3a5f]/50">
          <div className="text-sm font-medium text-gray-200 mb-3">Node Status</div>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-400 rounded-full mr-3 shadow-lg"></div>
              <span className="text-sm text-gray-200">Active</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-400 rounded-full mr-3 shadow-lg"></div>
              <span className="text-sm text-gray-200">Inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorldMap 