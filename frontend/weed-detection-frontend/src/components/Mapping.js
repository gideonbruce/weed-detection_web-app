import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.heat';


// Import custom weed icon
import weedIconImg from './assets/weed-icon.png';

// Fix for Leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom weed icon
const weedIcon = L.icon({
  iconUrl: weedIconImg,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const WeedDetectionMap = ({ onDetectionsUpdate }) => {
  const [center, setCenter] = useState([-0.68885, 34.78321]); 
  const [zoom, setZoom] = useState(16);
  const [detections, setDetections] = useState([]);
  const [droneAltitude, setDroneAltitude] = useState(10); // meters
  const [weather, setWeather] = useState({
    temperature: 0,
    humidity: 0,
    windSpeed: 0,
    windDirection: 'N',
    description: 'Loading...'
  });
  const [dronePosition, setDronePosition] = useState(null);
  const [droneAreaPolygons, setDroneAreaPolygons] = useState([]);
  const [isSimulating, setSimulating] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapLayer, setHeatmapLayer] = useState(null);
  
  const mapRef = useRef(null);
  const heatmapRef = useRef(null);

  // Simulated function to get weather data
  const fetchWeatherData = async (lat, lng) => {
    // Replace with actual API call to a weather service
    try {
      // Simulated data for demo
      setWeather({
        temperature: Math.round(15 + Math.random() * 10),
        humidity: Math.round(40 + Math.random() * 30),
        windSpeed: Math.round(5 + Math.random() * 15),
        windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
        description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
      });
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };


  useEffect(() => {
    if (onDetectionsUpdate && typeof onDetectionsUpdate === 'function') {
      onDetectionsUpdate(detections);
    }
  }, [detections, onDetectionsUpdate]);

  // Initialize and fetch weather
  useEffect(() => {
    fetchWeatherData(center[0], center[1]);
    
    // Refresh weather every 10 minutes
    const weatherInterval = setInterval(() => {
      fetchWeatherData(center[0], center[1]);
    }, 600000);
    
    return () => clearInterval(weatherInterval);
  }, [center]);

  // new func to create heatmap
  const updateHeatmap = useCallback(() => {
    if (!mapRef.current || detections.length === 0) return;

    const heatPoints = detections.map(detection => [
      detection.position[0],
      detection.position[1],
      detection.confidence / 100
    ]);

    if (heatmapRef.current) {
      mapRef.current.removeLayer(heatmapRef.current);
    }

    const newHeatmapLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.65: 'lime', 0.8: 'yellow', 1.0: 'red' }
    });

    if (showHeatmap) {
      newHeatmapLayer.addTo(mapRef.current);
    }

    heatmapRef.current = newHeatmapLayer;
    setHeatmapLayer(newHeatmapLayer);
  }, [detections, showHeatmap]);

  useEffect(() => {
    updateHeatmap();
  }, [detections, showHeatmap, updateHeatmap]);

  // to toggle heat map visibility
  const toggleHeatmap = () => {
    if (showHeatmap && heatmapRef.current) {
      mapRef.current.removeLayer(heatmapRef.current);
    } else if (!showHeatmap && heatmapRef.current) {
      heatmapRef.current.addTo(mapRef.current);
    }
    setShowHeatmap(!showHeatmap);
  };

  const exportDetectionsToJSON = useCallback(() => {
    if (!detections || detections.length === 0) {
      console.error("No detections available for export.");
      return;
    }

    const detectionsData = detections.map(detection => ({
      id: detection.id,
      latitude: detection.position ? detection.position[0] : null,
      longitude: detection.position ? detection.position[1] : null,
      timestamp: detection.timestamp || new Date().toISOString(),
      confidence: detection.confidence || 0,
    }));

    const jsonData = JSON.stringify(detectionsData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `weed-detections-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [detections]);

  // new weed detection
  const addWeedDetection = useCallback(async (lat, lng) => {
    if (lat == null || lng == null) {
      console.error("Invalid latitude or longitude recieved.");
      return;
    }

    const newDetection = {
      id: Date.now(), // using timestamp as unique id
      position: [lat, lng],
      latitude: lat,
      longitude: lng,
      confidence: Math.round(70 + Math.random() * 30), 
      timestamp: new Date().toISOString(),
      imageUrl: `https://via.placeholder.com/150?text=Weed+Detected`,
    };
    
    setDetections(prev => [...prev, newDetection]);

    //    sending detections to backend
    try {
        const response = await fetch('http://127.0.0.1:5000/store_detections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([newDetection]),
        });

        const result = await response.json();
        console.log('Backend response:', result);
    } catch (error) {
        console.error('Error sending data to backend:', error);
    }
  }, [setDetections]);
  
  const simulationRunningRef = useRef(false);
  // to simulate drone movement and detection
  const simulateDroneFlight = useCallback(() => {
    if (!dronePosition || droneAreaPolygons.length === 0) return;
    
    //setSimulating(true);
    simulationRunningRef.current = true;
    setSimulating(true);

    // first polygon for simulation
    const polygon = droneAreaPolygons[0];
    const bounds = L.latLngBounds(polygon);

    // systematic grid-based flight pattern
    const gridSize = 0.0005; // approx 50m at equator
    const rows = Math.ceil((bounds.getNorth() - bounds.getSouth()) / gridSize);
    const cols = Math.ceil((bounds.getEast() - bounds.getWest()) / gridSize);

    let currentRow = 0;
    let currentCol = 0;
    let direction = 1; // 1 for right, -1 for left

    const moveDrone = () => {
        if (!simulationRunningRef.current) return;

        // random position within polygon bounds based on grid
        const lat = bounds.getSouth() + (currentRow * gridSize);
        const lng = bounds.getWest() + (currentCol * gridSize);
        
        // update drone position
        setDronePosition([lat, lng]);

        const distanceToEdge = Math.min(
          lat - bounds.getSouth(),
          bounds.getNorth() - lat,
          lng - bounds.getWest(),
          bounds.getEast() - lng
        ) / gridSize;

        const detectionProbability = 0.3 + (1 / (distanceToEdge + 1)) * 0.4;

        if (Math.random() < detectionProbability) {
          const jitter = gridSize * 0.3;
          const jitteredLat = lat + (Math.random() * jitter * 2 - jitter);
          const jitteredLng = lng + (Math.random() * jitter * 2 - jitter);
          addWeedDetection(jitteredLat, jitteredLng);
        }

        // move to another position in serpentine pattern
        if (direction === 1) {
          if (currentCol < cols - 1) {
            currentCol++;
          } else {
            currentRow++;
            direction = -1;
          }
        } else {
          if (currentCol > 0) {
            currentCol--;
          } else {
            currentRow++;
            direction = 1;
          }
        }

        //checking if entere area is covered
        if (currentRow >= rows) {
          clearInterval(interval);
          simulationRunningRef.current = false;
          setSimulating(false);
          exportDetectionsToJSON();
        }
      };
  
    const interval = setInterval(moveDrone, 500);

    return () => {
      //clearInterval(interval);
      //setSimulating(false);
    };
  }, [dronePosition, droneAreaPolygons, addWeedDetection, exportDetectionsToJSON ]);


  // Map events component to handle map interactions
  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        // For testing: clicking on map adds a weed detection
        if (e.originalEvent.ctrlKey) {
          addWeedDetection(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  };

  // handle draw events
  const onCreated = (e) => {
    const { layerType, layer } = e;
    
    if (layerType === 'polygon') {
      const newPolygon = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
      setDroneAreaPolygons([newPolygon]);
      
      // if this is the first polygon, set drone at center
        const center = layer.getBounds().getCenter();
        setDronePosition([center.lat, center.lng]);
      }
    };
  //};

  // Control drone altitude
  const changeAltitude = (change) => {
    setDroneAltitude(prevAlt => {
      const newAlt = prevAlt + change;
      return newAlt > 0 ? newAlt : 1; // Min 1 meter
    });
  };

  // start drone sim
  const startSimulation = () => {
    if (dronePosition && droneAreaPolygons.length > 0 && !isSimulating) {
      setDetections([]);
      simulateDroneFlight();
    } else if (!dronePosition || droneAreaPolygons.length === 0) {
      alert("Please draw a polygon area first");
    }
  };
/*
  // Simulate drone movement when it has a position and a polygon
  useEffect(() => {
    if (dronePosition && droneAreaPolygons.length > 0 && !isSimulating) {
        simulateDroneFlight();
      //const interval = setInterval(simulateDroneFlight, 2000);
      //return () => clearInterval(interval);
    }
  }, [dronePosition, droneAreaPolygons, simulateDroneFlight, isSimulating]);*/

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-1/5 min-w-[200px]">
        <div className="info-panel">
          <h3 className='text-lg font-semibold text-gray-800 mb-2'>Drone Status</h3>
          <p className='text-sm text-gray-700'><span className='font-medium'>Altitude:</span> {droneAltitude} meters</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => changeAltitude(5)} className='px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700'>+5m</button>
            <button onClick={() => changeAltitude(-5)} className='px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700'>-5m</button>
          </div>
          
          <h3 className='text-lg font-semibold text-gray-800 mt-3 mb-2'>Weather</h3>
          <p className='text-sm text-gray-700'><span className="font-medium">Temperature:</span> {weather.temperature}°C</p>
          <p className='text-sm text-gray-700'><span className="font-medium">Humidity:</span> {weather.humidity}%</p>
          <p className='text-sm text-gray-700'><span className="font-medium">Wind:</span> {weather.windSpeed} km/h {weather.windDirection}</p>
          <p className='text-sm text-gray-700'><span className="font-medium">Conditions:</span> {weather.description}</p>
          
          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Weed Detections</h3>
          <p className="text-sm text-gray-700"><span className="font-medium">Total detected:</span> {detections.length}</p>

          <div className="mt-4 flex flex-wrap gap-1">
            <button
              onClick={startSimulation}
              disabled={isSimulating || !dronePosition || droneAreaPolygons.length === 0}
              className={`px-2 py-1 text-xs rounded text-white ${
                isSimulating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSimulating ? 'Simulating...' : 'Start'}
            </button>

            <button 
              onClick={toggleHeatmap}
              className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
            </button>

            <button
              onClick={exportDetectionsToJSON}
              disabled={detections.length === 0}
              className={`px-2 py-1 text-xs rounded text-white ${
                detections.length === 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
      
      <MapContainer
        center={center}
        zoom={zoom}
        className='className="h-[70vh] w-full rounded-2xl shadow-lg overflow-hidden'
        style={{ height: "70vh", width: "100%" }}
        whenCreated={mapInstance => { mapRef.current = mapInstance }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={onCreated}
            draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
            }}
            />
        </FeatureGroup>
        {/* Display drone's current position */}
        {dronePosition && (
          <Marker 
            position={dronePosition}
            icon={L.divIcon({
              html: `<div class="drone-marker" style="font-size: 24px;">🚁</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className='p-4 bg-white shadow-lg rounded-lg text-gray-800'>
                <h3 className='text-lg font-semibold mb-2'>Drone</h3>
                <p className='text-sm'>Altitude: {droneAltitude}m</p>
                <p className='text-sm'>Lat: {dronePosition[0].toFixed(6)}</p>
                <p className='text-sm'>Lng: {dronePosition[1].toFixed(6)}</p>
                <p className='text-sm'>
                  <span className='font-medium'>Status:</span>
                  <span className={`ml-1 px-2 py-1 rounded ${isSimulating ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                    {isSimulating ? 'Flying' : 'Idle'}
                    </span>
                    </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Display weed detections */}
        {detections.map(detection => (
          <Marker 
            key={detection.id}
            position={detection.position}
            icon={weedIcon}
          >
            <Popup>
              <div>
                <h3>Weed Detected</h3>
                <p>Confidence: {detection.confidence}%</p>
                <p>Time: {new Date(detection.timestamp).toLocaleTimeString()}</p>
                <p>Lat: {detection.position[0].toFixed(6)}</p>
                <p>Lng: {detection.position[1].toFixed(6)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        <MapEvents />
      </MapContainer>
      
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className='bg-white shadow-lg rounded-lg p-6 max-w-md w-full'>
          <h3 className='text-xl font-semibold text-gray-800 mb-4'>Instructions</h3>
          <ul className='list-disc list-inside space-y-2 text-gray-700'>
            <li>Use the polygon tool to draw drone coverage areas</li>
            <li>Click <span className='font-medium text-blue-600'>"Start Simulation"</span> to begin drone flight</li>
            <li>Drone will systematically cover the area and detect weeds</li>
            <li>Toggle the heatmap to visualize weed density</li>
            <li>Ctrl+Click on map to manually add a weed detection (testing 123)</li>
            <li>Click <span className='font-medium text-green-600'>"Export Detections to JSON"</span> to save detected weed coordinates</li>
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        .weed-detection-map-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .map-controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .info-panel {
          background: white;
          border-radius: 4px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .altitude-controls {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 15px;
        }

        .action-buttons button {
          padding: 8px 12px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .action-buttons button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .actions-buttons button:hover:not(:disabled) {
          background: #45a049;
        }
        
        .map-instructions {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
};

export default WeedDetectionMap;