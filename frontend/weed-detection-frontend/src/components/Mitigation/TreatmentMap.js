import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapUpdater } from './MapUpdater';
import L from 'leaflet';

// Custom weed icon
const weedIcon = L.icon({
  iconUrl: "/assets/weed-icon.png",
  iconSize: [16, 16],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Coordinate validation and precision
const COORDINATE_PRECISION = 8; // 8 decimal places for high precision
const validateCoordinate = (coord) => {
  if (typeof coord !== 'number' || isNaN(coord)) return false;
  return coord >= -90 && coord <= 90;
};

export const TreatmentMap = ({ areas = [], centerPosition = [0, 0], zoom = 16, calculatePolygonPoints }) => {
  // Validate center position
  const validCenter = centerPosition.every(validateCoordinate) ? centerPosition : [0, 0];
  
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
        center={validCenter}
        zoom={zoom}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={validCenter} zoom={zoom} />
        
        {areas.map((area, index) => {
          // Skip rendering if area is invalid
          if (!area) return null;
          
          try {
            const polygonPoints = calculatePolygonPoints(area);
            if (!polygonPoints || polygonPoints.length === 0) return null;
            
            // Validate and format polygon points
            const validPoints = polygonPoints.map(point => {
              if (!Array.isArray(point) || point.length !== 2) return null;
              const [lat, lng] = point;
              if (!validateCoordinate(lat) || !validateCoordinate(lng)) return null;
              return [parseFloat(lat.toFixed(COORDINATE_PRECISION)), parseFloat(lng.toFixed(COORDINATE_PRECISION))];
            }).filter(point => point !== null);

            if (validPoints.length < 3) return null; // Need at least 3 points for a polygon
            
            return (
              <Polygon
                key={`area-${index}`}
                positions={validPoints}
                pathOptions={{ 
                  color: area.type === 'broadcast' ? 'red' : 'orange', 
                  fillOpacity: 0.3,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold">{area.type === 'broadcast' ? 'Broadcast Area' : 'Treatment Zone'}</h3>
                    <p>Area ID: {area.id || index}</p>
                    <p>Points: {validPoints.length}</p>
                    {area.weedCount && <p>Weed Count: {area.weedCount}</p>}
                  </div>
                </Popup>
              </Polygon>
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