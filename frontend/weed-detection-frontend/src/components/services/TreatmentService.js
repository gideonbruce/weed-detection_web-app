import {v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Enhanced coordinate calculations with high precision
const COORDINATE_PRECISION = 8;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1)   * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  };
  
  // Calculate bounds of a set of weeds with validation
const calculateBounds = (weeds) => {
  if (!Array.isArray(weeds) || weeds.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  
  weeds.forEach(weed => {
    if (weed.latitude && weed.longitude) {
      const lat = parseFloat(weed.latitude);
      const lng = parseFloat(weed.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }
  });
  
  if (minLat === Infinity || maxLat === -Infinity || minLng === Infinity || maxLng === -Infinity) {
    return null;
  }

  return {
    southWest: [
      parseFloat(minLat.toFixed(COORDINATE_PRECISION)),
      parseFloat(minLng.toFixed(COORDINATE_PRECISION))
    ],
    northEast: [
      parseFloat(maxLat.toFixed(COORDINATE_PRECISION)),
      parseFloat(maxLng.toFixed(COORDINATE_PRECISION))
    ]
  };
};
  
  // Expand bounds by a given amount
const expandBounds = (bounds, amount) => {
  return {
    southWest: [bounds.southWest[0] - amount, bounds.southWest[1] - amount],
    northEast: [bounds.northEast[0] + amount, bounds.northEast[1] + amount]
  };
};

// Calculate center point of a polygon with high precision
const calculatePolygonCenter = (points) => {
  if (!Array.isArray(points) || points.length < 3) {
    return null;
  }

  let sumLat = 0;
  let sumLng = 0;
  let validPoints = 0;

  points.forEach(point => {
    if (Array.isArray(point) && point.length === 2) {
      const [lat, lng] = point;
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        sumLat += lat;
        sumLng += lng;
        validPoints++;
      }
    }
  });

  if (validPoints === 0) {
    return null;
  }

  return [
    parseFloat((sumLat / validPoints).toFixed(COORDINATE_PRECISION)),
    parseFloat((sumLng / validPoints).toFixed(COORDINATE_PRECISION))
  ];
};

// Calculate distance between two points in meters using Haversine formula
const calculateDistanceHaversine = (point1, point2) => {
  if (!Array.isArray(point1) || !Array.isArray(point2) || point1.length !== 2 || point2.length !== 2) {
    return null;
  }

  const [lat1, lng1] = point1;
  const [lat2, lng2] = point2;

  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Calculate area of a polygon in square meters
const calculatePolygonArea = (points) => {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  let area = 0;
  const R = 6371e3; // Earth's radius in meters

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[j];

    area += (lng2 - lng1) * (2 + Math.sin(lat1 * Math.PI/180) + Math.sin(lat2 * Math.PI/180));
  }

  area = Math.abs(area * R * R / 2);
  return parseFloat(area.toFixed(2)); // Area in square meters
};

// Calculate rough area in square meters from bounds
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
  
  // convex hull calculation for points
const calculateConvexHull = (weeds) => {
  const bounds = calculateBounds(weeds);
  const expandedBounds = expandBounds(bounds, 0.00005); // Add 5 meter buffer
  
  return [
    [expandedBounds.southWest[0], expandedBounds.southWest[1]],
    [expandedBounds.southWest[0], expandedBounds.northEast[1]],
    [expandedBounds.northEast[0], expandedBounds.northEast[1]],
    [expandedBounds.northEast[0], expandedBounds.southWest[1]]
  ];
};
  
  // get recommended herbicide based on weed confidence
const getRecommendedHerbicide = (confidence) => {
  if (confidence >= 90) {
    return 'High-Strength Selective Herbicide';
  } else if (confidence >= 75) {
    return 'Medium-Strength Selective Herbicide';
  } else {
    return 'Standard Selective Herbicide';
  }
};
  
  // creating treatment zones by grouping nearby weeds
const createTreatmentZones = (weeds) => {
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
      // create convex hull shape
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
  
  // Generate treatment plan based on weed detections and selected method
export const generateTreatmentPlan = (weedDetections, treatmentMethod) => {
  console.log("Generating Treatment Plan...");
  console.log("Weed Detections:", weedDetections);
  console.log("Treatment Method:", treatmentMethod);

  if (weedDetections.length === 0) {
    console.warn("No weed detections found. Returning empty plan.");
    return { areas: [], plan: null };
  }

  let areas = [];
  
  switch (treatmentMethod) {
    case 'precision':
      // for precision treatment, create small circular areas around each weed
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
      // For broadcast,  create one large area covering all weeds
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
      console.error("Invalid treatement method:", treatmentMethod);
      areas = [];
  }
  
  // generate a treatment plan object
  const plan = {
    id: uuidv4(),
    method: treatmentMethod,
    areas: areas,
    createdAt: new Date().toISOString(),
    totalWeeds: weedDetections.length,
    status: 'created'
  };
   console.log("Generated Plan:", plan);

  return { areas, plan };
};
  
  // calculate treatment statistics
export const calculateTreatmentStats = (weeds, method) => {
  if (!weeds || weeds.length === 0) {
    return {
      totalWeeds: 0,
      highDensityAreas: 0,
      estimatedChemicalUsage: 0,
      estimatedTimeRequired: 0,
      costEstimate: 0
    };
  }
    
  const totalWeeds = weeds.length;
  let chemicalUsage = 0;
  let timeRequired = 0;
  let costEstimate = 0;
  
    // calculating high density areas
  const zones = createTreatmentZones(weeds);
  const highDensityThreshold = 5; // 5 weeds in a zone is considered high density
  const highDensityAreas = zones.filter(zone => zone.weedCount >= highDensityThreshold).length;
  
  // calculate estimates based on treatment method
  switch (method) {
    case 'precision':
      // precision spraying uses less chemical but takes more time
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
        // Uses more chemical but is faster for a lot of weeds
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
    
    return {
      totalWeeds,
      highDensityAreas,
      estimatedChemicalUsage: Math.round(chemicalUsage * 10) / 10, // Round to 1 decimal place
      estimatedTimeRequired: Math.round(timeRequired),
      costEstimate: Math.round(costEstimate)
    };
  };
  
  // Export treatment plan to JSON
  export const exportTreatmentPlan = (currentTreatmentPlan) => {
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
      a.download = `treatment-plan-${currentTreatmentPlan.id}.json`;
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
  export const saveTreatmentPlan = async (currentTreatmentPlan) => {
    if (!currentTreatmentPlan) {
      console.error("Save failed: No treatment plan available.");
      throw new Error("No treatment plan to save!");
    }
    
    try {
      // formatting data for backend
      const formattedData = {
        method: currentTreatmentPlan.method,
        areas: currentTreatmentPlan.areas,
        total_weeds: currentTreatmentPlan.totalWeeds
      };

      console.log("Saving treatment plan to database:", formattedData);

      const response = await fetch('http://127.0.0.1:5000/treatment-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        throw new Error(errorData.message || 'Failed to save treatment plan');
      }
      
      const result = await response.json();
      console.log('Backend response:', result);
      return result;
    } catch (error) {
      console.error('Error sending treatment plan to backend:', error);
      throw error;
    }
  };

  // Retrieve treatment plan from database by ID
export const fetchTreatmentPlanById = async (planId) => {
  try {
    console.log(`Fetching treatment plan with ID: ${planId}`);
    
    const response = await fetch(`http://127.0.0.1:5000/treatment-plans/${planId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.message || `Failed to fetch treatment plan with ID ${planId}`);
    }
    
    const plan = await response.json();
    console.log('Retrieved plan:', plan);
    return plan;
  } catch (error) {
    console.error(`Error fetching treatment plan with ID ${planId}:`, error);
    throw error;
  }
};

// Retrieve all treatment plans
export const fetchAllTreatmentPlans = async () => {
  try {
    const response = await fetch('http://127.0.0.1:5000/treatment-plans', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.message || 'Failed to fetch treatment plans');
    }
    
    const plans = await response.json();
    console.log('Retrieved all plans:', plans);
    return plans;
  } catch (error) {
    console.error('Error fetching all treatment plans:', error);
    throw error;
  }
};

// Update treatment plan status
export const updateTreatmentPlanStatus = async (planId, newStatus) => {
  try {
    console.log(`Updating treatment plan ${planId} status to: ${newStatus}`);
    
    const response = await fetch(`http://127.0.0.1:5000/api/treatment-plans/${planId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      throw new Error(errorData.message || `Failed to update treatment plan status`);
    }
    
    const updatedPlan = await response.json();
    console.log('Updated plan:', updatedPlan);
    return updatedPlan;
  } catch (error) {
    console.error(`Error updating treatment plan status:`, error);
    throw error;
  }
};

export const aggregateDetectionsByDensity = (detections) => {
  // Group detections into clusters based on proximity and density
  // Return data structured for visualization and planning
  const aggregated = {
    highDensity: [],
    mediumDensity: [],
    lowDensity: []
  };
  
  
  return aggregated;
};