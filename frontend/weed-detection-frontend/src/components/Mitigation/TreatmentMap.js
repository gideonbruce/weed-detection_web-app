import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapUpdater } from './MapUpdater';

export const TreatmentMap = ({ areas = [], centerPosition = [0, 0], zoom = 16, calculatePolygonPoints }) => {
  // adding validation to check if areas is array and not empty
  const hasValidAreas = Array.isArray(areas) && areas.length > 0;
  
  // checking if calculatePolygonPoints is defined
  if (!calculatePolygonPoints && hasValidAreas) {
    console.error("calculatePolygonPoints function is missing");
    return (
      <div className="border rounded-lg overflow-hidden mt-4 p-4 bg-red-100 text-red-800">
        Error: calculatePolygonPoints function is missing
      </div>
    );
  }
  
  // If no valid areas, show a message instead of an empty map
  if (!hasValidAreas) {
    return (
      <div className="border rounded-lg overflow-hidden mt-4 p-4 bg-yellow-100 text-yellow-800">
        No treatment areas available to display
      </div>
    );
  }

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
          // Skip rendering if area is invalid
          if (!area) return null;
          
          try {
            const polygonPoints = calculatePolygonPoints(area);
            if (!polygonPoints || polygonPoints.length === 0) return null;
            
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
          } catch (error) {
            console.error(`Error rendering area ${index}:`, error);
            return null;
          }
        })}
      </MapContainer>
    </div>
  );
};