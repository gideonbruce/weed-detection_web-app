import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// weed icon
const weedIcon = L.icon({
  iconUrl: "/assets/weed-icon.png",
  iconSize: [10, 10],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const TreatmentMap = ({ weedDetections, treatmentAreas, centerPosition, zoom }) => {
  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Treatment Map</h2>
      <div className="border rounded-lg overflow-hidden">
        <MapContainer
          center={centerPosition}
          zoom={zoom}
          style={{ height: "400px", width: "100%" }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Weed Detections */}
          {weedDetections.map(weed => (
            <Marker key={weed.id} position={[weed.latitude, weed.longitude]} icon={weedIcon}>
              <Popup>
                <h3 className="font-semibold">Weed Detected</h3>
                <p>Confidence: {weed.confidence}%</p>
                <p>Lat: {weed.latitude.toFixed(6)}</p>
                <p>Lng: {weed.longitude.toFixed(6)}</p>
              </Popup>
            </Marker>
          ))}

          {/* Treatment Areas */}
          {treatmentAreas.map((area, index) => (
            <Polygon
              key={`area-${index}`}
              positions={
                area.points || 
                (area.bounds
                    ? [
                        [area.bounds.southWest?.[0], area.bounds.southWest?.[1]],
                        [area.bounds.southWest?.[0], area.bounds.northEast?.[1]],
                        [area.bounds.northEast?.[0], area.bounds.northEast?.[1]],
                        [area.bounds.northEast?.[0], area.bounds.southWest?.[1]]
                      ]
                    : []) // if bounds are undefined, empty array
              }
              pathOptions={{ 
                color: area.type === 'broadcast' ? 'red' : 
                       area.type === 'zone' ? 'orange' : 
                       area.type === 'precision' ? 'green' : 'gray',
                fillOpacity: 0.3,
                weight: 2
              }}
            >
              <Popup>
                <h3 className="font-semibold">{area.type === 'broadcast' ? 'Broadcast Area' : area.type === 'zone' ? 'Treatment Zone' : 'Precision Treatment'}</h3>
                <p>Weeds: {area.weedCount}</p>
              </Popup>
            </Polygon>
          ))}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="mt-4">
        <h3 className="font-semibold text-gray-800">Legend</h3>
        <div className="flex gap-4 mt-2">
          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">Weed</span>
          <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">Zone Treatment</span>
          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">Broadcast Treatment</span>
        </div>
      </div>
    </div>
  );
};

export default TreatmentMap;