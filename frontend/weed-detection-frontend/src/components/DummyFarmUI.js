import React, { useState, useEffect, useRef } from 'react';

const DroneFarmMapping = () => {
  const [weeds, setWeeds] = useState([]);
  const [flightPolygon, setFlightPolygon] = useState([]);
  const [droneAltitude, setDroneAltitude] = useState(10);
  const [droneSpeed, setDroneSpeed] = useState(5); // m/s
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedWeed, setSelectedWeed] = useState(null);
  const [mapMode, setMapMode] = useState('view'); // 'view', 'draw', 'edit'
  const [scannedArea, setScannedArea] = useState(null);
  const [weatherCondition, setWeatherCondition] = useState('clear');
  const [windSpeed, setWindSpeed] = useState(0);
  const [savedMissions, setSavedMissions] = useState([]);
  const [currentMission, setCurrentMission] = useState(null);
  const [detectableWeeds, setDetectableWeeds] = useState([]);
  const canvasRef = useRef(null);
  
  //    in meters
  const farmDimensions = { width: 100, height: 80 };
  
  // scaling factors for display
  const scale = {
    x: 8,
    y: 8
  };

  const weedTypes = [
    { name: 'dandelion', color: '#FF5733', detectability: 0.9, growthRate: 0.5 },
  ];

  const weatherEffects = {
    clear: { detectModifier: 1.0, description: "Ideal conditions for detection", icon: "☀️"},
    cloudy: { detectModifier: 0.9, description: "Slightly reduced visibility", icon: "☁️"},
    lightRain: { detectModifier: 0.7, description: "Water droplets may interfere with sensors", icon: "🌦️"},
    heavyRain: { detectModifier: 0.4, description: "Significant detection challenges", icon: "🌧️"},
    windy: { detectModifier: 0.85, description: "Flight stability may be affected", icon: "💨"},
    foggy: { detectModifier: 0.5, description: "Very limited visibility", icon: "🌫️"}
  };
  
  useEffect(() => {
    generateRandomWeeds(150);
    drawMap();

    const savedData = localStorage.getItem('droneMission');
    if (savedData) {
      try {
        setSavedMissions(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to load saved missions", e);
      }
    }
  }, []);

  useEffect(() => {
    drawMap();
  /*}, [weeds, flightPolygon, mapMode, scannedArea]);*/
    if (scannedArea) {
      calculateDetectableWeeds();
    }
  }, [weeds, flightPolygon, mapMode, scannedArea, weatherCondition, windSpeed]);

  const generateRandomWeeds = (count = 100) => {
    const newWeeds = [];

    // generate random distribution
    const createCluster = (centerX, centerY, radius, count) => {
      const clusterWeeds = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.random() * radius;

        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist;

        if (x >= 0 && x <= farmDimensions.width && y >= 0 && y <= farmDimensions.height) {
          clusterWeeds.push({
            x, y
          });
        }
      }
      return clusterWeeds;
    };

    const clusterCount = 3 + Math.floor(Math.random() * 4);
    const clusterPositions = [];
    
    for (let i = 0; i < clusterCount; i++) {
      clusterPositions.push({
        x: 10 + Math.random() * (farmDimensions.width - 20),
        y: 10 + Math.random() * (farmDimensions.height - 20),
        radius: 5 + Math.random() * 15,
        count: Math.floor(count / clusterCount * (0.7 + Math.random() * 0.6))
      });
    }
    clusterPositions.forEach(cluster => {
      const clusterWeeds = createCluster(cluster.x, cluster.y, cluster.radius, cluster.count);

      clusterWeeds.forEach(weed => {
        const randomType = weedTypes[Math.floor(Math.random() * weedTypes.length)];

        newWeeds.push({
          id: `weed-${newWeeds.length}`,
          x: weed.x,
          y: weed.y,
          size: Math.random() * 0.8 + 0.2,
          type: randomType.name,
          color: randomType.color,
          detectability: randomType.detectability * (0.9 + Math.random() * 0.2),
          growthRate: randomType.growthRate * (0.9 + Math.random() * 0.2),
          growthStage: Math.floor(Math.random() * 5),
          detectionConfidence: 0
        });
      });
    });

    //random weeds
    const isolatedCount = Math.floor(count * 0.2);
    for (let i = 0; i < isolatedCount; i++) {
      const randomType = weedTypes[Math.floor(Math.random() * weedTypes.length)];

      newWeeds.push({
        id: `weed-${newWeeds.length}`,
        x: Math.random() * farmDimensions.width,
        y: Math.random() * farmDimensions.height,
        size: Math.random() * 0.8 + 0.2,
        type: randomType.name,
        color: randomType.color,
        detectability: randomType.detectability * (0.9 + Math.random() * 0.2),
        growthRate: randomType.growthRate * (0.9 + Math.random() * 0.2),
        growthStage: Math.floor(Math.random() * 5),
        detectionConfidence: 0
      });
    }

    setWeeds(newWeeds);
  };

  const calculateDetectableWeeds = () => {
    if (!scannedArea) return;

    const weatherMod = weatherEffects[weatherCondition].detectionModifier;
    const windMod = Math.max(0, 1 - (windSpeed / 50)); // Wind reduces detection at high speeds
    const altitudeMod = Math.max(0.5, 1 - ((droneAltitude - 5) / 50));

    const detected = weeds
      .filter(weed => isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon))
      .map(weed => {
        // Calculate detection probability
        const baseProbability = weed.detectability * weatherMod * windMod * altitudeMod;
        // Adjust for growth stage - larger plants are easier to detect
        const growthMod = 0.7 + (weed.growthStage * 0.075);
        const detectionProbability = Math.min(1, baseProbability * growthMod);
        
        // Random component to simulate sensor variability
        const randomFactor = 0.8 + Math.random() * 0.4;
        const finalConfidence = Math.min(1, detectionProbability * randomFactor);

        // Only return if the confidence is above threshold
        if (finalConfidence > 0.3) {
          return {
            ...weed,
            detectionConfidence: finalConfidence
          };
        }
        return null;
      })
      .filter(weed => weed !== null);
      
    setDetectableWeeds(detected);
  };
  
  const startDrawPolygon = () => {
    setIsDrawing(true);
    setFlightPolygon([]);
    setMapMode('draw');
    setScannedArea(null);
  };
  
  const finishDrawPolygon = () => {
    setIsDrawing(false);
    setMapMode('view');
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

    // Draw weather effects
    drawWeatherOverlay(ctx, width, height);
    
    // Draw weeds
    drawWeeds(ctx);
  };
  
  const drawFarmBackground = (ctx, width, height) => {
    //  soil background
    ctx.fillStyle = '#b5651d';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#567d46';
    for (let i = 0; i < farmDimensions.width; i += 2) {
      for (let j = 0; j < farmDimensions.height; j += 6) {
        ctx.fillRect(i * scale.x, j * scale.y, scale.x * 1.5, scale.y * 5);
      }
    }

    //texture
    ctx.fillStyle = '#a35c1a';
    for (let i = 0; i < width; i += 4) {
      for (let j = 0; j < height; j += 4) {
        if (Math.random() > 0.8) {
          ctx.fillRect(i, j, 2, 2);
        }
      }
    }
    
    // grid lines 
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

  // weather
  const drawWeatherOverlay = (ctx, width, height) => {
    ctx.save(); // appliying weather to canvas

    switch(weatherCondition) {
      case 'cloudy':
        ctx.fillStyle = 'rgba(200, 200, 200, 0.1)';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'lightRain':
        ctx.fillStyle = 'rgba(100, 150, 255, 0.05)';
        ctx.fillRect(0, 0, width, height);
        drawRain(ctx, width, height, 50);
        break;
      case 'heavyRain':
          // Add darker blue tint and more raindrops
        ctx.fillStyle = 'rgba(70, 120, 220, 0.15)';
        ctx.fillRect(0, 0, width, height);
        drawRain(ctx, width, height, 200);
        break;
      case 'foggy':
        // Add white overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'windy':
        // Add slight motion blur effect
        if (windSpeed > 10) {
          ctx.filter = 'blur(1px)';
          // We'll just add a wind indicator rather than actually blurring
          drawWindIndicators(ctx, width, height);
        }
        break;

    }
    ctx.restore();
  };

  const drawRain = (ctx, width, height, count) => {
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const length = 5 + Math.random() * 10;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1, y + length);
      ctx.stroke();
    }
  };

  const drawWindIndicators = (ctx, width, height) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    const windDensity = Math.min(100, windSpeed * 5);
    
    for (let i = 0; i < windDensity; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const length = 5 + Math.random() * (windSpeed / 2);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
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

    // flight pattern inside polygon (grid pattern representing flight lines)
    if (flightPolygon.length > 2 && mapMode === 'view') {
      drawFlightPattern(ctx);
    }
    
    //  vertices
    ctx.fillStyle = 'blue';
    flightPolygon.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x * scale.x, point.y * scale.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    //  altitude indicator
    if (flightPolygon.length > 0) {
      const center = getCenterOfPolygon();
      
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(`${droneAltitude}m`, center.x * scale.x, center.y * scale.y);
    }
  };
  
  const drawFlightPattern = (ctx) => {
    if (flightPolygon.length < 3) return;
    
    ctx.strokeStyle = 'rgba(0, 120, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);

    //  bounding box of polygon
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    flightPolygon.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });

    // horizontal scan lines representing drone flight path.......
    const spacing = 5; // 5m between scan lines
    for (let y = Math.floor(minY / spacing) * spacing; y <= maxY; y += spacing) {
      let intersections = [];

      //  intersections with polygon edges
      for (let i = 0; i < flightPolygon.length; i++) {
        const p1 = flightPolygon[i];
        const p2 = flightPolygon[(i + 1) % flightPolygon.length];

        // Check if line segment crosses our horizontal line
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          // Calculate intersection x-coordinate
          const x = p1.x + (y - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
          intersections.push(x);
        }
      }

      // Sort intersections
      intersections.sort((a, b) => a - b);

      // lines between pairs of intersections
      for (let i = 0; i < intersections.length; i += 2) {
        if (i + 1 < intersections.length) {
          ctx.beginPath();
          ctx.moveTo(intersections[i] * scale.x, y * scale.y);
          ctx.lineTo(intersections[i + 1] * scale.x, y * scale.y);
          ctx.stroke();
        }
      }
    }

    ctx.setLineDash([]);
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
      // Find if this weed is actually detected
      const detectedWeed = detectableWeeds.find(w => w.id === weed.id);
      const isDetected = !!detectedWeed;

      // Only show weeds in unscanned areas or detected weeds in scanned areas
      const isVisible = !scannedArea || 
                       !isPointInPolygon({x: weed.x, y: weed.y}, scannedArea.polygon) || 
                       isDetected;
          
      if (!isVisible) return;
      
      // Draw weed
      ctx.fillStyle = isDetected
       ? weed.color
       : 'rgba(100, 100, 100, 0.3)'; // Undetected weeds are gray

      const sizeMultiplier = 3 + weed.growthStage;

      ctx.beginPath();
      ctx.sizeMultiplier = 3 + weed.growthStage;
      ctx.arc(
        weed.x * scale.x,
        weed.y * scale.y,
        weed.size * sizeMultiplier,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      //  detection confidence indicator for detected weeds
      if (isDetected) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(
          weed.x * scale.x,
          weed.y * scale.y,
          weed.size * 10 * detectedWeed.detectionConfidence,
          0,
          Math.PI * 2
        );
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
    // Only search detectable weeds
    return detectableWeeds.find(weed => {
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
    if (!scannedArea) {
      alert("Please perform a drone scan first");
      return;
    }

    const data = {
      farmDimensions,
      mission: {
        id: currentMission ? currentMission.id : `mission-${Date.now()}`,
        timestamp: new Date().toISOString(),
        flightPlan: {
          polygon: flightPolygon,
          altitude: droneAltitude,
          speed: droneSpeed
        },
        environment: {
          weather: weatherCondition,
          windSpeed: windSpeed,
          detectionModifier: weatherEffects[weatherCondition].detectionModifier
        },
        timeEstimate: {
          flightTimeMinutes: calculateFlightTime(),
          area: calculatePolygonArea(flightPolygon),
          scanEfficiency: weatherEffects[weatherCondition].detectionModifier
        },
        scanResult: {
          timestamp: scannedArea.timestamp,
          detectedWeeds: detectableWeeds.map(weed => ({
            id: weed.id,
            coordinates: { x: weed.x.toFixed(2), y: weed.y.toFixed(2) },
            type: weed.type,
            size: weed.size.toFixed(2),
            growthStage: weed.growthStage,
            detectionConfidence: weed.detectionConfidence.toFixed(2)
          }))
        }
      }
    };

    //  blob and download link
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `farm-scan-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also save to localStorage
    saveMissionToLocalStorage(data.mission);
  };

  const saveMissionToLocalStorage = (mission) => {
    // Save to local storage
    let updatedMissions = [...savedMissions];

    // Update if exists, otherwise add
    const existingIndex = updatedMissions.findIndex(m => m.id === mission.id);
    if (existingIndex >= 0) {
      updatedMissions[existingIndex] = mission;
    } else {
      updatedMissions.push(mission);
    }

    // Keep only the latest 10 missions
    if (updatedMissions.length > 10) {
      updatedMissions = updatedMissions.slice(-10);
    }

    setSavedMissions(updatedMissions);
    localStorage.setItem('droneMissions', JSON.stringify(updatedMissions));
    setCurrentMission(mission);
  };

  const loadMission = (mission) => {
    setFlightPolygon(mission.flightPlan.polygon);
    setDroneAltitude(mission.flightPlan.altitude);
    setDroneSpeed(mission.flightPlan.speed || 5);
    setWeatherCondition(mission.environment.weather || 'clear');
    setWindSpeed(mission.environment.windSpeed || 0);
    setCurrentMission(mission);

    // Setting scanned area if it exists
    if (mission.scanResult) {
      setScannedArea({
        polygon: mission.flightPlan.polygon,
        timestamp: mission.scanResult.timestamp
      });

      // Converting stored detected weeds back to our format
      if (mission.scanResult.detectedWeeds && mission.scanResult.detectedWeeds.length > 0) {
        const convertedWeeds = mission.scanResult.detectedWeeds.map(weed => ({
          id: weed.id,
          x: parseFloat(weed.coordinates.x),
          y: parseFloat(weed.coordinates.y),
          size: parseFloat(weed.size),
          type: weed.type,
          growthStage: weed.growthStage || 0,
          detectionConfidence: parseFloat(weed.detectionConfidence)
        }));
        setDetectableWeeds(convertedWeeds);
      }
    } else {
      setScannedArea(null);
    }
  };

  const resetFlightPlan = () => {
    setFlightPolygon([]);
    setScannedArea(null);
    setDetectableWeeds([]);
    setCurrentMission([null]);
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

    //  which weeds are detected
    calculateDetectableWeeds();
  };

  const calculateFlightTime = () => {
    if (flightPolygon.length < 3) return 0;
    
    //  area to be covered
    const area = calculatePolygonArea(flightPolygon);

    // perimeter
    let perimeter = 0;
    for (let i = 0; i < flightPolygon.length; i++) {
      const p1 = flightPolygon[i];
      const p2 = flightPolygon[(i + 1) % flightPolygon.length];
      perimeter += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    // Estimate flight path length based on scan pattern (approximately)
    const scanLineSpacing = 5; // 5m between scan lines
    const scanLinesCount = Math.ceil(area / (perimeter * scanLineSpacing / 2));
    const totalDistance = perimeter + (scanLinesCount * (perimeter / 2));

    // Calculate time based on drone speed (add 10% for turns and other factors)
    const timeInSeconds = (totalDistance / droneSpeed) * 1.1;

    // Weather factor 
    let weatherFactor = 1.0;
    if (weatherCondition === 'lightRain') weatherFactor = 1.2;
    if (weatherCondition === 'heavyRain') weatherFactor = 1.5;
    if (weatherCondition === 'windy' && windSpeed > 15) weatherCondition = 1.3;

    return Math.ceil((timeInSeconds * weatherFactor) / 60);
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