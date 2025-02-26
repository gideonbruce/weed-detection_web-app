import React, { useState, useEffect, useRef } from 'react';

const DroneFarmMapping = () => {
  const [weeds, setWeeds] = useState([]);
  const [flightPolygon, setFlightPolygon] = useState([]);
  const [droneAltitude, setDroneAltitude] = useState(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedWeed, setSelectedWeed] = useState(null);
  const [mapMode, setMapMode] = useState('view'); // 'view', 'draw', 'edit'
  const [scannedArea, setScannedArea] = useState(null);
  const canvasRef = useRef(null);
  
  // Farm dimensions in meters
  const farmDimensions = { width: 100, height: 80 };
  
  // Scaling factors for display
  const scale = {
    x: 8,
    y: 8
  };

  const weatherEffects = {
    clear: { detectModifier: 1.0, description: "Ideal conditions for detection", icon: "☀️"},
    cloudy: { detectModifier: 0.9, description: "Slightly reduced visibility", icon: "☁️"},
    lightRain: { detectModifier: 0.7, description: "Water droplets may interfere with sensors", icon: "🌦️"},
    heavyRain: { detectModifier: 0.4, description: "Significant detection challenges", icon: "🌧️"},
    windy: { detectModifier: 0.85, description: "Flight stability may be affected", icon: "💨"},
    foggy: { detectModifier: 0.5, description: "Very limited visibility", icon: "🌫️"}
  }
  
  useEffect(() => {
    generateRandomWeeds();
    drawMap();
  }, []);

  useEffect(() => {
    drawMap();
  }, [weeds, flightPolygon, mapMode, scannedArea]);

  const generateRandomWeeds = () => {
    const newWeeds = [];
    // Generate 20-50 random weeds
    const weedCount = 20 + Math.floor(Math.random() * 30);
    
    for (let i = 0; i < weedCount; i++) {
      newWeeds.push({
        id: `weed-${i}`,
        x: Math.random() * farmDimensions.width,
        y: Math.random() * farmDimensions.height,
        size: Math.random() * 0.8 + 0.2,
        type: ['dandelion', 'thistle', 'nettle', 'ragweed', 'pigweed'][Math.floor(Math.random() * 5)],
        detectionConfidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
      });
    }
    setWeeds(newWeeds);
  };
  
  const startDrawPolygon = () => {
    setIsDrawing(true);
    setFlightPolygon([]);
    setMapMode('draw');
  };
  
  const finishDrawPolygon = () => {
    setIsDrawing(false);
    setMapMode('view');
    
    // Simulate scanned area
    if (flightPolygon.length >= 3) {
      setScannedArea({
        polygon: flightPolygon,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw farm background with crop rows
    drawFarmBackground(ctx, width, height);
    
    // Draw flight polygon
    if (flightPolygon.length > 0) {
      drawFlightPath(ctx);
    }
    
    // Draw scanned area if exists
    if (scannedArea) {
      drawScannedArea(ctx);
    }
    
    // Draw weeds
    drawWeeds(ctx);
  };
  
  const drawFarmBackground = (ctx, width, height) => {
    // Draw soil background
    ctx.fillStyle = '#b5651d';
    ctx.fillRect(0, 0, width, height);
    
    // Draw crop rows
    ctx.fillStyle = '#567d46';
    for (let i = 0; i < farmDimensions.width; i += 2) {
      for (let j = 0; j < farmDimensions.height; j += 6) {
        ctx.fillRect(i * scale.x, j * scale.y, scale.x * 1.5, scale.y * 5);
      }
    }
    
    // Draw grid lines (faint)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let i = 0; i <= farmDimensions.width; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i * scale.x, 0);
      ctx.lineTo(i * scale.x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= farmDimensions.height; i += 5) {
      ctx.beginPath();
      ctx.moveTo(0, i * scale.y);
      ctx.lineTo(width, i * scale.y);
      ctx.stroke();
    }
  };
  
  const drawFlightPath = (ctx) => {
    // Draw the polygon outline
    ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    flightPolygon.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x * scale.x, point.y * scale.y);
      } else {
        ctx.lineTo(point.x * scale.x, point.y * scale.y);
      }
    });
    
    if (mapMode === 'view' && flightPolygon.length > 2) {
      ctx.closePath();
    }
    ctx.stroke();
    
    // Draw the vertices
    ctx.fillStyle = 'blue';
    flightPolygon.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x * scale.x, point.y * scale.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw altitude indicator
    if (flightPolygon.length > 0) {
      const center = getCenterOfPolygon();
      
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(`${droneAltitude}m`, center.x * scale.x, center.y * scale.y);
    }
  };
  
  const drawScannedArea = (ctx) => {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    scannedArea.polygon.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x * scale.x, point.y * scale.y);
      } else {
        ctx.lineTo(point.x * scale.x, point.y * scale.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  
  const drawWeeds = (ctx) => {
    weeds.forEach(weed => {
      // Check if weed is within scanned area
      const isDetected = scannedArea ? isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon) : false;
      
      // Draw weed
      ctx.fillStyle = isDetected ? 'rgba(255, 50, 50, 0.8)' : 'rgba(255, 50, 50, 0.3)';
      ctx.beginPath();
      ctx.arc(weed.x * scale.x, weed.y * scale.y, (weed.size * 4) + (isDetected ? 1 : 0), 0, Math.PI * 2);
      ctx.fill();
      
      // Draw detection confidence indicator for detected weeds
      if (isDetected) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(weed.x * scale.x, weed.y * scale.y, weed.size * 8 * weed.detectionConfidence, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  };
  
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale.x;
    const y = (e.clientY - rect.top) / scale.y;
    
    if (mapMode === 'draw') {
      setFlightPolygon([...flightPolygon, { x, y }]);
    } else {
      // Check if clicked on a weed
      const clickedWeed = findClickedWeed(x, y);
      setSelectedWeed(clickedWeed);
    }
  };
  
  const findClickedWeed = (x, y) => {
    // Only show detected weeds if there's a scanned area
    const visibleWeeds = scannedArea 
      ? weeds.filter(weed => isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon))
      : weeds;
      
    return visibleWeeds.find(weed => {
      const distance = Math.sqrt(Math.pow(weed.x - x, 2) + Math.pow(weed.y - y, 2));
      return distance <= weed.size;
    });
  };
  
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };
  
  const getCenterOfPolygon = () => {
    if (flightPolygon.length === 0) return { x: 0, y: 0 };
    
    let sumX = 0, sumY = 0;
    flightPolygon.forEach(point => {
      sumX += point.x;
      sumY += point.y;
    });
    
    return {
      x: sumX / flightPolygon.length,
      y: sumY / flightPolygon.length
    };
  };
  
  const exportData = () => {
    const detectedWeeds = scannedArea 
      ? weeds.filter(weed => isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon))
      : [];
    
    const data = {
      farmDimensions,
      flightPlan: {
        polygon: flightPolygon,
        altitude: droneAltitude,
      },
      scanResult: {
        timestamp: scannedArea?.timestamp || new Date().toISOString(),
        detectedWeeds: detectedWeeds.map(weed => ({
          id: weed.id,
          coordinates: { x: weed.x.toFixed(2), y: weed.y.toFixed(2) },
          type: weed.type,
          size: weed.size.toFixed(2),
          detectionConfidence: weed.detectionConfidence.toFixed(2)
        }))
      }
    };
    
    alert("Data exported to console");
    console.log(JSON.stringify(data, null, 2));
  };
  
  const resetFlightPlan = () => {
    setFlightPolygon([]);
    setScannedArea(null);
  };
  
  const simulateDroneFlight = () => {
    if (flightPolygon.length < 3) {
      alert("Please draw a valid flight path first");
      return;
    }
    
    // Simulate drone flight by marking the area as scanned
    setScannedArea({
      polygon: flightPolygon,
      timestamp: new Date().toISOString()
    });
  };
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Drone Farm Mapping System</h2>
      
      <div className="flex mb-4 gap-4">
        <button 
          onClick={startDrawPolygon}
          className={`px-4 py-2 rounded ${mapMode === 'draw' ? 'bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
        >
          Draw Flight Path
        </button>
        
        {mapMode === 'draw' && (
          <button 
            onClick={finishDrawPolygon}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Finish Drawing
          </button>
        )}
        
        <button 
          onClick={simulateDroneFlight}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          disabled={flightPolygon.length < 3}
        >
          Simulate Drone Flight
        </button>
        
        <button 
          onClick={resetFlightPlan}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Reset
        </button>
        
        <button 
          onClick={exportData}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Export Data
        </button>
      </div>
      
      <div className="flex gap-6">
        <div>
          <div className="bg-gray-800 p-2 rounded-lg shadow-lg">
            <canvas 
              ref={canvasRef} 
              width={farmDimensions.width * scale.x} 
              height={farmDimensions.height * scale.y}
              onClick={handleCanvasClick}
              className="border border-gray-700 cursor-crosshair"
            />
          </div>
          
          <div className="mt-2 flex items-center">
            <label className="mr-2 text-gray-700">Drone Altitude:</label>
            <input
              type="range"
              min="5"
              max="30"
              value={droneAltitude}
              onChange={(e) => setDroneAltitude(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="ml-2 text-gray-700">{droneAltitude} meters</span>
          </div>
        </div>
        
        <div className="w-64">
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold text-lg mb-2">Flight Information</h3>
            {flightPolygon.length > 0 ? (
              <div>
                <p><span className="font-semibold">Vertices:</span> {flightPolygon.length}</p>
                <p><span className="font-semibold">Altitude:</span> {droneAltitude}m</p>
                <p><span className="font-semibold">Area:</span> {calculatePolygonArea(flightPolygon).toFixed(1)} m²</p>
                {scannedArea && (
                  <p className="text-green-600"><span className="font-semibold">Status:</span> Scanned</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No flight path defined</p>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow mb-4">
            <h3 className="font-bold text-lg mb-2">Weed Detection</h3>
            {scannedArea ? (
              <div>
                <p><span className="font-semibold">Weeds Detected:</span> {
                  weeds.filter(weed => isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon)).length
                }</p>
                <p><span className="font-semibold">Scan Time:</span> {new Date(scannedArea.timestamp).toLocaleTimeString()}</p>
                {selectedWeed && (
                  <div className="mt-2 p-2 bg-gray-100 rounded">
                    <p className="font-bold">Selected Weed:</p>
                    <p><span className="font-semibold">Type:</span> {selectedWeed.type}</p>
                    <p><span className="font-semibold">Location:</span> ({selectedWeed.x.toFixed(1)}, {selectedWeed.y.toFixed(1)})</p>
                    <p><span className="font-semibold">Confidence:</span> {(selectedWeed.detectionConfidence * 100).toFixed(0)}%</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No scan data available</p>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-bold text-lg mb-2">Instructions</h3>
            <ol className="list-decimal ml-5 text-sm">
              <li className="mb-1">Click "Draw Flight Path" to define drone's flight area</li>
              <li className="mb-1">Click on map to add polygon vertices</li>
              <li className="mb-1">Set drone altitude using the slider</li>
              <li className="mb-1">Click "Finish Drawing" when done</li>
              <li className="mb-1">Click "Simulate Drone Flight" to scan for weeds</li>
              <li className="mb-1">Click on detected weeds (red dots) for details</li>
              <li className="mb-1">Export data for your ML model integration</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate polygon area
function calculatePolygonArea(polygon) {
  let area = 0;
  const n = polygon.length;
  
  if (n < 3) return 0;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  
  return Math.abs(area / 2);
}

export default DroneFarmMapping;