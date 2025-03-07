import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapUpdater } from './MapUpdater';

export const TreatmentMap = ({ areas, centerPosition, zoom, calculatePolygonPoints }) => {
  return (
    <div className="border rounded-lg overflow-hidden mt-4">
      <MapContainer
        center={centerPosition}
        zoom={zoom}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={centerPosition} zoom={zoom} />
        
        {areas.map((area, index) => {
          const polygonPoints = calculatePolygonPoints(area);
          if (polygonPoints.length === 0) return null;
          
          return (
            <Polygon
              key={`area-${index}`}
              positions={polygonPoints}
              pathOptions={{ 
                color: area.type === 'broadcast' ? 'red' : 'orange', 
                fillOpacity: 0.3,
                weight: 2
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};