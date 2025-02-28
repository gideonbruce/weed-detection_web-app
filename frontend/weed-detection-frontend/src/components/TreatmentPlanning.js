import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Assuming you've already imported your weed icon
// import weedIconImg from './assets/weed-icon.png';

const TreatmentPlanning = ({ detections = [] }) => {
  const [center, setCenter] = useState([-0.68885, 34.78321]);
  const [zoom, setZoom] = useState(16);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [herbicideNeeded, setHerbicideNeeded] = useState(0);
  const [selectedHerbicide, setSelectedHerbicide] = useState('glyphosate');
  const [applicationRate, setApplicationRate] = useState(2); // L/hectare
  const [densityThreshold, setDensityThreshold] = useState(3); // Minimum number of weeds to consider an area for treatment
  const [gridSize, setGridSize] = useState(20); // Grid size in meters
  const [treatmentZones, setTreatmentZones] = useState([]);
  const [costEstimate, setCostEstimate] = useState(0);

  // Herbicide options
  const herbicides = [
    { id: 'glyphosate', name: 'Glyphosate (Non-selective)', rate: 2, costPerLiter: 10 },
    { id: 'dicamba', name: 'Dicamba (Broadleaf)', rate: 1.5, costPerLiter: 15 },
    { id: '2-4-d', name: '2,4-D (Broadleaf)', rate: 1.2, costPerLiter: 12 },
    { id: 'atrazine', name: 'Atrazine (Pre-emergent)', rate: 2.5, costPerLiter: 8 },
  ];

  // Function to generate treatment zones based on weed density
  const generateTreatmentPlan = () => {
    if (!detections || detections.length === 0) {
      alert('No weed detections available to create a treatment plan');
      return;
    }

    // Create a grid of the area to analyze weed density
    const bounds = L.latLngBounds(detections.map(d => [d.latitude, d.longitude]));
    const expanded = bounds.pad(0.2); // Expand bounds by 20% for better visualization
    
    // Convert grid size from meters to rough lat/lng degrees (approximation)
    // 111,320 meters = 1 degree of latitude at the equator
    const latDegreePerMeter = 1 / 111320;
    const lngDegreePerMeter = 1 / (111320 * Math.cos(bounds.getCenter().lat * Math.PI / 180));
    const latStep = gridSize * latDegreePerMeter;
    const lngStep = gridSize * lngDegreePerMeter;
    
    // Create grid cells
    const grid = [];
    for (let lat = expanded.getSouth(); lat < expanded.getNorth(); lat += latStep) {
      for (let lng = expanded.getWest(); lng < expanded.getEast(); lng += lngStep) {
        const cell = {
          bounds: [
            [lat, lng],
            [lat + latStep, lng],
            [lat + latStep, lng + lngStep],
            [lat, lng + lngStep]
          ],
          center: [lat + latStep/2, lng + lngStep/2],
          weedCount: 0,
          weeds: []
        };
        
        // Count weeds in this cell
        detections.forEach(weed => {
          if (weed.latitude >= lat && weed.latitude < lat + latStep &&
              weed.longitude >= lng && weed.longitude < lng + lngStep) {
            cell.weedCount++;
            cell.weeds.push(weed);
          }
        });
        
        if (cell.weedCount >= densityThreshold) {
          grid.push(cell);
        }
      }
    }
    
    // Convert grid cells to GeoJSON for visualization
    const zones = grid.map((cell, index) => ({
      type: 'Feature',
      properties: { 
        id: index, 
        weedCount: cell.weedCount,
        density: cell.weedCount / (gridSize * gridSize / 10000), // weeds per hectare
        needsTreatment: cell.weedCount >= densityThreshold
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [cell.bounds[0][1], cell.bounds[0][0]],
          [cell.bounds[1][1], cell.bounds[1][0]],
          [cell.bounds[2][1], cell.bounds[2][0]],
          [cell.bounds[3][1], cell.bounds[3][0]],
          [cell.bounds[0][1], cell.bounds[0][0]]
        ]]
      }
    }));
    
    setTreatmentZones(zones);
    
    // Calculate total area to be treated in hectares
    // Each cell is gridSize x gridSize square meters
    const areaToTreat = zones.length * (gridSize * gridSize / 10000); // in hectares
    
    // Calculate herbicide needed
    const selectedHerbicideData = herbicides.find(h => h.id === selectedHerbicide);
    const herbicideAmount = areaToTreat * selectedHerbicideData.rate;
    setHerbicideNeeded(herbicideAmount);
    
    // Calculate cost estimate
    const totalCost = herbicideAmount * selectedHerbicideData.costPerLiter;
    setCostEstimate(totalCost);
    
    // Create treatment plan summary
    setTreatmentPlan({
      date: new Date().toISOString().split('T')[0],
      herbicide: selectedHerbicideData.name,
      applicationRate: selectedHerbicideData.rate,
      totalArea: areaToTreat.toFixed(2),
      totalHerbicide: herbicideAmount.toFixed(2),
      estimatedCost: totalCost.toFixed(2),
      zoneCount: zones.length,
      totalDetections: detections.length,
      highestDensity: Math.max(...zones.map(z => z.properties.weedCount)),
      recommendedEquipment: zones.length > 10 ? 'Tractor-mounted sprayer' : 'Backpack sprayer'
    });
  };
  
  // Style function for GeoJSON
  const getZoneStyle = (feature) => {
    const count = feature.properties.weedCount;
    // Color based on weed density
    const intensity = Math.min(1, count / 15); // normalize between 0 and 1
    return {
      fillColor: `rgba(255, 0, 0, ${intensity * 0.7})`,
      weight: 1,
      opacity: 0.8,
      color: 'red',
      fillOpacity: 0.5
    };
  };
  
  useEffect(() => {
    // Reset the treatment plan when the detections change
    setTreatmentPlan(null);
    setTreatmentZones([]);
    
    // If detections exist, center the map on their average position
    if (detections && detections.length > 0) {
      const latSum = detections.reduce((sum, d) => sum + d.latitude, 0);
      const lngSum = detections.reduce((sum, d) => sum + d.longitude, 0);
      setCenter([latSum / detections.length, lngSum / detections.length]);
    }
  }, [detections]);
  
  // When herbicide selection changes, update application rate
  useEffect(() => {
    const selectedHerbicideData = herbicides.find(h => h.id === selectedHerbicide);
    if (selectedHerbicideData) {
      setApplicationRate(selectedHerbicideData.rate);
    }
  }, [selectedHerbicide]);
  
  const exportTreatmentPlan = () => {
    if (!treatmentPlan) {
      alert("Please generate a treatment plan first");
      return;
    }
    
    const planData = {
      ...treatmentPlan,
      zones: treatmentZones.map(zone => ({
        id: zone.properties.id,
        weedCount: zone.properties.weedCount,
        coordinates: zone.geometry.coordinates,
      }))
    };
    
    const jsonData = JSON.stringify(planData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `treatment-plan-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="treatment-planning-container">
      <h2>Weed Treatment Planning</h2>
      
      <div className="treatment-controls">
        <div className="control-section">
          <h3>Treatment Parameters</h3>
          
          <div className="control-group">
            <label htmlFor="herbicide-select">Herbicide Type:</label>
            <select 
              id="herbicide-select" 
              value={selectedHerbicide}
              onChange={(e) => setSelectedHerbicide(e.target.value)}
            >
              {herbicides.map((herbicide) => (
                <option key={herbicide.id} value={herbicide.id}>{herbicide.name}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label htmlFor="application-rate">Application Rate (L/ha):</label>
            <input 
              type="number" 
              id="application-rate" 
              min="0.1" 
              step="0.1" 
              value={applicationRate}
              onChange={(e) => setApplicationRate(parseFloat(e.target.value))}
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="density-threshold">Weed Density Threshold:</label>
            <input 
              type="number" 
              id="density-threshold" 
              min="1" 
              max="20" 
              value={densityThreshold}
              onChange={(e) => setDensityThreshold(parseInt(e.target.value))}
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="grid-size">Treatment Grid Size (m):</label>
            <input 
              type="number" 
              id="grid-size" 
              min="5" 
              max="50" 
              step="5" 
              value={gridSize}
              onChange={(e) => setGridSize(parseInt(e.target.value))}
            />
          </div>
          
          <button 
            className="generate-plan-btn"
            onClick={generateTreatmentPlan}
            disabled={!detections || detections.length === 0}
          >
            Generate Treatment Plan
          </button>
        </div>
        
        {treatmentPlan && (
          <div className="treatment-summary">
            <h3>Treatment Plan Summary</h3>
            <div className="summary-content">
              <p><strong>Date:</strong> {treatmentPlan.date}</p>
              <p><strong>Herbicide:</strong> {treatmentPlan.herbicide}</p>
              <p><strong>Application Rate:</strong> {treatmentPlan.applicationRate} L/ha</p>
              <p><strong>Total Area to Treat:</strong> {treatmentPlan.totalArea} ha</p>
              <p><strong>Total Herbicide Needed:</strong> {treatmentPlan.totalHerbicide} L</p>
              <p><strong>Estimated Cost:</strong> ${treatmentPlan.estimatedCost}</p>
              <p><strong>Treatment Zones:</strong> {treatmentPlan.zoneCount}</p>
              <p><strong>Recommended Equipment:</strong> {treatmentPlan.recommendedEquipment}</p>
              <button className="export-plan-btn" onClick={exportTreatmentPlan}>
                Export Treatment Plan
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="treatment-map-container">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Display weed detections */}
          {detections.map(detection => (
            <Marker 
              key={detection.id}
              position={[detection.latitude, detection.longitude]}
              // icon={weedIcon} // Uncomment if you have a weed icon defined
            >
              <Popup>
                <div>
                  <h3>Weed Detected</h3>
                  <p>Confidence: {detection.confidence}%</p>
                  <p>Time: {new Date(detection.timestamp).toLocaleTimeString()}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {/* Display treatment zones */}
          {treatmentZones.length > 0 && (
            <GeoJSON 
              data={{ 
                type: 'FeatureCollection', 
                features: treatmentZones 
              }} 
              style={getZoneStyle}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(`
                  <strong>Zone ${feature.properties.id}</strong><br/>
                  Weed Count: ${feature.properties.weedCount}<br/>
                  Density: ${(feature.properties.weedCount / (gridSize * gridSize / 10000)).toFixed(1)} weeds/ha
                `);
              }}
            />
          )}
        </MapContainer>
      </div>
      
      <style jsx>{`
        .treatment-planning-container {
          margin: 20px 0;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        
        .treatment-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .control-section {
          flex: 1;
          min-width: 300px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .treatment-summary {
          flex: 1;
          min-width: 300px;
          padding: 15px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .control-group {
          margin-bottom: 15px;
        }
        
        .control-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .control-group input,
        .control-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .generate-plan-btn,
        .export-plan-btn {
          padding: 10px 15px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          width: 100%;
          margin-top: 10px;
        }
        
        .generate-plan-btn:hover,
        .export-plan-btn:hover {
          background: #45a049;
        }
        
        .generate-plan-btn:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }
        
        .treatment-map-container {
          margin-top: 20px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default TreatmentPlanning;