import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
//import weedIconImg from '../assets/weed-icon.png'; 

// weed icon
const weedIcon = L.icon({
  iconUrl: "/weed-icon.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const TreatmentPlanning = () => {
  const [weedDetections, setWeedDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState('precision');
  const [treatmentAreas, setTreatmentAreas] = useState([]);
  const [currentTreatmentPlan, setCurrentTreatmentPlan] = useState(null);
  const [centerPosition, setCenterPosition] = useState([-0.68885, 34.78321]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStats, setTreatmentStats] = useState({
    totalWeeds: 0,
    highDensityAreas: 0,
    estimatedChemicalUsage: 0,
    estimatedTimeRequired: 0,
    costEstimate: 0
  });

  // fetch data from backend
  useEffect(() => {
    const fetchWeedDetections = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:5000/get_detections');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setWeedDetections(data);
        
        // if we have detections, center the map on the first one
        if (data.length > 0) {
          setCenterPosition([data[0].latitude, data[0].longitude]);
          setZoom(17);
        }
        
        // calculate stats based on weed detections
        calculateTreatmentStats(data, selectedTreatment);
      } catch (err) {
        console.error("Error fetching weed detections:", err);
        setError(err.message);
        
        // For development/demo purposes - create mock data if backend is not available
        const mockData = generateMockData();
        console.log(mockData);
        setWeedDetections(mockData);
        calculateTreatmentStats(mockData, selectedTreatment);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWeedDetections();
  }, []);

  // generate mock data for development/demo
  const generateMockData = () => {
    const baseLat = -0.68885;
    const baseLng = 34.78321;
    const mockData = [];
    
    // generate 50 random weed detections around the base position
    for (let i = 0; i < 50; i++) {
      const latOffset = (Math.random() - 0.5) * 0.01;
      const lngOffset = (Math.random() - 0.5) * 0.01;
      
      mockData.push({
        id: i + 1,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        confidence: Math.round(70 + Math.random() * 30),
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      });
    }
    
    return mockData;
  };

  //  recalculate treatment plans when treatment method or weed data changes
  useEffect(() => {
    if (weedDetections.length > 0) {
      generateTreatmentPlan(selectedTreatment);
      calculateTreatmentStats(weedDetections, selectedTreatment);
    }
  }, [selectedTreatment, weedDetections]);

  // generate treatment plan based on weed detections and selected method
  const generateTreatmentPlan = useCallback((treatmentMethod) => {
    if (weedDetections.length === 0) return;
    
    let areas = [];
    
    switch (treatmentMethod) {
      case 'precision':
        // For precision treatment, we create small circular areas around each weed
        areas = weedDetections.map(weed => {
          return {
            center: [weed.latitude, weed.longitude],
            radius: 2, // 2 meters radius
            type: 'spot',
            weedCount: 1,
            herbicide: getRecommendedHerbicide(weed.confidence)
          };
        });
        break;
        
      case 'zone':
        // for zone treatment, we cluster nearby weeds
        areas = createTreatmentZones(weedDetections);
        break;
        
      case 'broadcast':
        // For broadcast, we create one large area covering all weeds
        if (weedDetections.length > 0) {
          const bounds = calculateBounds(weedDetections);
          areas = [{
            bounds: bounds,
            type: 'broadcast',
            weedCount: weedDetections.length,
            herbicide: 'Standard Herbicide Mix'
          }];
        }
        break;
        
      default:
        areas = [];
    }
    
    setTreatmentAreas(areas);
    
    // generate a treatment plan object
    const plan = {
      method: treatmentMethod,
      areas: areas,
      createdAt: new Date().toISOString(),
      totalWeeds: weedDetections.length,
    };
    
    setCurrentTreatmentPlan(plan);
  }, []);

  // calculate treatment statistics
  const calculateTreatmentStats = (weeds, method) => {
    if (!weeds || weeds.length === 0) {
      setTreatmentStats({
        totalWeeds: 0,
        highDensityAreas: 0,
        estimatedChemicalUsage: 0,
        estimatedTimeRequired: 0,
        costEstimate: 0
      });
      return;
    }
    
    const totalWeeds = weeds.length;
    let chemicalUsage = 0;
    let timeRequired = 0;
    let costEstimate = 0;
    
    // calculating high density areas
    const zones = createTreatmentZones(weeds);
    const highDensityThreshold = 5; // 5 weeds in a zone is considered high density
    const highDensityAreas = zones.filter(zone => zone.weedCount >= highDensityThreshold).length;
    
    // Calculate estimates based on treatment method
    switch (method) {
      case 'precision':
        // Precision spraying uses less chemical but takes more time
        chemicalUsage = totalWeeds * 0.05; // 0.05 liters per weed
        timeRequired = totalWeeds * 1; // 1 minute per weed
        costEstimate = 10 + (chemicalUsage * 20) + (timeRequired / 60 * 30); // Base cost + chemical cost + labor cost
        break;
        
      case 'zone':
        // Zone treatment is a middle ground
        chemicalUsage = totalWeeds * 0.1; // 0.1 liters per weed
        timeRequired = zones.length * 5; // 5 minutes per zone
        costEstimate = 20 + (chemicalUsage * 15) + (timeRequired / 60 * 20); 
        break;
        
      case 'broadcast':
        //  uses more chemical but is faster for alot of weeds
        const area = calculateTotalArea(weeds);
        chemicalUsage = area * 0.002; // 0.002 liters per square meter
        timeRequired = Math.sqrt(area) * 0.5; // Rough estimate based on area size
        costEstimate = 30 + (chemicalUsage * 10) + (timeRequired / 60 * 10); 
        break;
      default:
        console.warn(`Unknown method: ${method}`);
        chemicalUsage = 0;
        timeRequired = 0;
        costEstimate = 0;
    }
    
    setTreatmentStats({
      totalWeeds,
      highDensityAreas,
      estimatedChemicalUsage: Math.round(chemicalUsage * 10) / 10, // Round to 1 decimal place
      estimatedTimeRequired: Math.round(timeRequired),
      costEstimate: Math.round(costEstimate)
    });
  };

  // Helper functions
  const createTreatmentZones = (weeds) => {
    //     group weeds that are within 10 meters of each other
    const zones = [];
    const processed = new Set();
    
    for (let i = 0; i < weeds.length; i++) {
      if (processed.has(i)) continue;
      
      const zoneWeeds = [weeds[i]];
      processed.add(i);
      
      // find all weeds close to this one
      for (let j = 0; j < weeds.length; j++) {
        if (i === j || processed.has(j)) continue;
        
        const distance = calculateDistance(
          weeds[i].latitude, weeds[i].longitude,
          weeds[j].latitude, weeds[j].longitude
        );
        
        if (distance < 0.0001) { // approximately 10 meters
          zoneWeeds.push(weeds[j]);
          processed.add(j);
        }
      }
      
      // calculate zone polygon
      if (zoneWeeds.length > 2) {
        // create convex hull  shape
        const points = calculateConvexHull(zoneWeeds);
        zones.push({
          points,
          type: 'zone',
          weedCount: zoneWeeds.length,
          herbicide: 'Moderate-Strength Herbicide'
        });
      } else if (zoneWeeds.length === 2) {
        // create a rectangle area
        const bounds = calculateBounds(zoneWeeds);
        const expandedBounds = expandBounds(bounds, 0.00005); // add 5 meter buffer
        zones.push({
          bounds: expandedBounds,
          type: 'zone',
          weedCount: zoneWeeds.length,
          herbicide: 'Moderate-Strength Herbicide'
        });
      } else {
        // Single weed - small circular area
        zones.push({
          center: [zoneWeeds[0].latitude, zoneWeeds[0].longitude],
          radius: 3, // 3 meters radius
          type: 'zone',
          weedCount: 1,
          herbicide: getRecommendedHerbicide(zoneWeeds[0].confidence)
        });
      }
    }
    
    return zones;
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  // calculates bounds of a set of weeds
  const calculateBounds = (weeds) => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    
    weeds.forEach(weed => {
      minLat = Math.min(minLat, weed.latitude);
      maxLat = Math.max(maxLat, weed.latitude);
      minLng = Math.min(minLng, weed.longitude);
      maxLng = Math.max(maxLng, weed.longitude);
    });
    
    return {
      southWest: [minLat, minLng],
      northEast: [maxLat, maxLng]
    };
  };
  
  // xxpands bounds by a given amount
  const expandBounds = (bounds, amount) => {
    return {
      southWest: [bounds.southWest[0] - amount, bounds.southWest[1] - amount],
      northEast: [bounds.northEast[0] + amount, bounds.northEast[1] + amount]
    };
  };
  
  // calculates rough area in square meters from bounds
  const calculateTotalArea = (weeds) => {
    const bounds = calculateBounds(weeds);
    const latDistance = calculateDistance(
      bounds.southWest[0], bounds.southWest[1],
      bounds.northEast[0], bounds.southWest[1]
    );
    const lngDistance = calculateDistance(
      bounds.southWest[0], bounds.southWest[1],
      bounds.southWest[0], bounds.northEast[1]
    );
    
    return latDistance * lngDistance;
  };
  
  // Simple convex hull calculation for points (Graham scan algorithm simplified)
  const calculateConvexHull = (weeds) => {
    // For simplicity, just create a buffer around the weeds
    // In a real application, use a proper convex hull algorithm
    const bounds = calculateBounds(weeds);
    const expandedBounds = expandBounds(bounds, 0.00005); // Add 5 meter buffer
    
    return [
      [expandedBounds.southWest[0], expandedBounds.southWest[1]],
      [expandedBounds.southWest[0], expandedBounds.northEast[1]],
      [expandedBounds.northEast[0], expandedBounds.northEast[1]],
      [expandedBounds.northEast[0], expandedBounds.southWest[1]]
    ];
  };
  
  // Get recommended herbicide based on weed confidence
  const getRecommendedHerbicide = (confidence) => {
    if (confidence >= 90) {
      return 'High-Strength Selective Herbicide';
    } else if (confidence >= 75) {
      return 'Medium-Strength Selective Herbicide';
    } else {
      return 'Standard Selective Herbicide';
    }
  };
  
  // Export treatment plan to JSON
  const exportTreatmentPlan = () => {
    try {
      if (!currentTreatmentPlan) {
        console.error("Export failed: No treatment plan available.");
        alert("No treatment plan to export!");
        return;
      }

      console.log("Exporting treatment plan:", currentTreatmentPlan);
      
      const jsonData = JSON.stringify(currentTreatmentPlan, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `treatment-plan-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);

      console.log("Starting download...");
      a.click();
      console.log("Download initiated.");
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("Cleaned up temporary URL.");
    } catch (error) {
      console.error("Error exporting treatment plan:", error);
      alert("An error occurred while exporting the treatment plan.");
    }
  };
  
  // Send treatment plan to backend
  const saveTreatmentPlan = async () => {
    if (!currentTreatmentPlan) return;
    
    try {
      const response = await fetch('http://127.0.0.1:5000/save_treatment_plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentTreatmentPlan),
      });
      
      const result = await response.json();
      console.log('Backend response:', result);
      alert('Treatment plan saved successfully!');
    } catch (error) {
      console.error('Error sending treatment plan to backend:', error);
      alert('Failed to save treatment plan. Please try again.');
    }
  };

  // Render loading state
  if (loading) {
    return <div className="loading">Loading treatment planning data...</div>;
  }

  // Render error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Error loading weed detection data</h2>
        <p>{error}</p>
        <p>Using mock data for demonstration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
    {/* Header Section */}
    <div className="flex justify-between items-center bg-white p-4 shadow-md rounded-lg mb-6">
      <h1 className="text-xl font-bold text-gray-800">Treatment Planning</h1>
      <div className="flex gap-4">
        <Link to="/weeds-detected" className="text-blue-600 hover:underline">View Weed Detections</Link>
        <Link to="/farm" className="text-blue-600 hover:underline">Back to Mapping</Link>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Treatment Options Section */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Treatment Options</h2>
        
        <div className="space-y-4">
          {/* Precision Treatment */}
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition ${
              selectedTreatment === 'precision' ? 'bg-green-100 border-green-500' : 'bg-gray-50'
            }`}
            onClick={() => setSelectedTreatment('precision')}
          >
            <h3 className="text-md font-semibold text-gray-700">Precision Treatment</h3>
            <p className="text-sm text-gray-600">Target individual weeds with minimal herbicide.</p>
            <ul className="list-disc ml-5 text-sm text-gray-500">
              <li>Lowest environmental impact</li>
              <li>Most time-consuming</li>
              <li>Highest precision</li>
            </ul>
          </div>

          {/* Zone Treatment */}
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition ${
              selectedTreatment === 'zone' ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-50'
            }`}
            onClick={() => setSelectedTreatment('zone')}
          >
            <h3 className="text-md font-semibold text-gray-700">Zone Treatment</h3>
            <p className="text-sm text-gray-600">Treat clusters of weeds in defined zones.</p>
            <ul className="list-disc ml-5 text-sm text-gray-500">
              <li>Balanced approach</li>
              <li>Good efficiency</li>
              <li>Moderate herbicide use</li>
            </ul>
          </div>

          {/* Broadcast Treatment */}
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition ${
              selectedTreatment === 'broadcast' ? 'bg-red-100 border-red-500' : 'bg-gray-50'
            }`}
            onClick={() => setSelectedTreatment('broadcast')}
          >
            <h3 className="text-md font-semibold text-gray-700">Broadcast Treatment</h3>
            <p className="text-sm text-gray-600">Apply herbicide across the entire infested area.</p>
            <ul className="list-disc ml-5 text-sm text-gray-500">
              <li>Fastest application</li>
              <li>Highest herbicide usage</li>
              <li>Best for severe infestations</li>
            </ul>
          </div>
        </div>

        {/* Treatment Stats */}
        <h3 className="text-md font-semibold text-gray-800 mt-6">Treatment Statistics</h3>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="p-3 bg-gray-50 rounded shadow">
            <span className="text-xs text-gray-500">Total Weeds:</span>
            <p className="font-semibold text-gray-800">{treatmentStats.totalWeeds}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded shadow">
            <span className="text-xs text-gray-500">High Density Areas:</span>
            <p className="font-semibold text-gray-800">{treatmentStats.highDensityAreas}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded shadow">
            <span className="text-xs text-gray-500">Est. Chemical Usage:</span>
            <p className="font-semibold text-gray-800">{treatmentStats.estimatedChemicalUsage} L</p>
          </div>
          <div className="p-3 bg-gray-50 rounded shadow">
            <span className="text-xs text-gray-500">Est. Time Required:</span>
            <p className="font-semibold text-gray-800">{treatmentStats.estimatedTimeRequired} min</p>
          </div>
          <div className="p-3 bg-gray-50 rounded shadow">
            <span className="text-xs text-gray-500">Est. Cost:</span>
            <p className="font-semibold text-gray-800">{treatmentStats.costEstimate} Ksh</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button 
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={exportTreatmentPlan}
          >
            Export Plan
          </button>
          <button 
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={saveTreatmentPlan}
          >
            Save & Schedule
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Treatment Map</h2>
        <div className="border rounded-lg overflow-hidden">
          <MapContainer
            center={centerPosition}
            zoom={zoom}
            style={{ height: "400px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

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
                positions={area.points || [
                  [area.bounds.southWest[0], area.bounds.southWest[1]],
                  [area.bounds.southWest[0], area.bounds.northEast[1]],
                  [area.bounds.northEast[0], area.bounds.northEast[1]],
                  [area.bounds.northEast[0], area.bounds.southWest[1]]
                ]}
                pathOptions={{ color: area.type === 'broadcast' ? 'red' : 'orange', fillOpacity: 0.3 }}
              >
                <Popup>
                  <h3 className="font-semibold">{area.type === 'broadcast' ? 'Broadcast Area' : 'Treatment Zone'}</h3>
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
    </div>
  </div>

  );
};

export default TreatmentPlanning;