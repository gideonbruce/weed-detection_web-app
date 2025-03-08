/**
 * Calculates the center of a treatment area
 * @param {Object} area - The treatment area object
 * @returns {Array} - [Latitude, longitude] pair for the center
 */

export const calculateAreaCenter = (area) => {
  console.log(`[DEBUG] Calculating area center for:`, area);
  // if area has explicit center use it
  if (area.center && typeof area.center.latitude === 'number' && typeof area.center.longitude === 'number') {
    console.log(`[DEBUG] Using explicit center: [${area.center.latitude}, ${area.center.longitude}]`);
    return [area.center.latitude, area.center.longitude];
  }

    // if area has bounds use center of th ebounds
  if (area.points && area.bounds.southWest && area.bounds.northEast) {
      const { southWest, northEast } = area.bounds;
      console.log(`[DEBUG] Using bounds for center calculation:`, area.bounds);
      const center =  [
        (southWest.latitude + northEast.latitude) / 2,
        (southWest.longitude + northEast.longitude) /2
      ];
      console.log(`[DEBUG] Calculated center from bounds: [${center[0]}, ${center[1]}]`);
      return center;
  }
    // if area has points, calculate the centroid
  if (area.points && Array.isArray(area.points) && area.points.length > 0) {
    console.log(`[DEBUG] Calculating centroid from ${area.points.length} points`);
    const validPoints = area.points.filter(point =>
      point && typeof point.latitude === 'number' && typeof point.longitude === 'number'
    );
    console.log(`[DEBUG] Found ${validPoints.length} valid points`);

    if (validPoints.length > 0) {
      const sumLat = validPoints.reduce((sum, point) => sum + point.latitude, 0);
      const sumLng = validPoints.reduce((sum, point) => sum + point.longitude, 0);
      const center = [sumLat / validPoints.length, sumLng / validPoints.length];
      console.log(`[DEBUG] Calculated centroid: [${center[0]}, ${center[1]}]`);
      return center;
    }
  }
  console.warn(`[WARN] Could not calculate center, using default [0, 0]`);
    
  return [0, 0]; // Default fallback
};

export const fetchTreatmentPlanById = async (planId) => {
  try {
    console.log(`[DEBUG] Fetching treatment plan with ID: ${planId}`);
    const response = await fetch(`/treatment-plans/${planId}`);
    
    if (!response.ok) {
      console.error(`[ERROR] Failed to fetch treatment plan: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch treatment plan: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[DEBUG] Raw treatment plan data received:`, data);
    
    // Check if data has the required structure
    if (!data) {
      console.error(`[ERROR] Treatment plan data is null or undefined`);
    } else if (!data.areas) {
      console.warn(`[WARN] Treatment plan has no areas property, adding empty array`);
      data.areas = [];
    } else if (!Array.isArray(data.areas)) {
      console.warn(`[WARN] Treatment plan areas is not an array, converting`, data.areas);
      data.areas = [data.areas];
    } else {
      console.log(`[DEBUG] Treatment plan has ${data.areas.length} areas`);
    }
    
    console.log(`[DEBUG] Processed treatment plan data:`, data);
    return data;
  } catch (err) {
    console.error(`[ERROR] Error fetching treatment plan:`, err);
    throw err;
  }
};

export const sendTreatmentCommand = async (treatmentPlan) => {
  try {
    console.log(`[DEBUG] Sending treatment command:`, treatmentPlan);
    // Replace with actual API call
    const response = await fetch('http://127.0.0.1:5000/mitigate_weed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(treatmentPlan),
    });
    
    if (!response.ok) {
      console.error(`[ERROR] Treatment command failed with status: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[DEBUG] Treatment command response:`, data);
    return data;
  } catch (error) {
    console.error(`[ERROR] Error sending treatment command:`, error);
    return { success: false, message: `Failed to send treatment command: ${error.message}` };
  }
};
  

  export const calculatePolygonPoints = (area) => {
    // if area already has points use them
    if (area.points && Array.isArray(area.points) && area.points.length > 0) {
      return area.points.filter(point =>
        point && typeof point.latitude === 'number' && typeof point.longitude === 'number'
      ).map(point => [point.latitude, point.longitude]);
    }
    
    if (area.bounds && area.bounds.southWest && area.bounds.northEast) {
      const { southWest, northEast } = area.bounds;

      if (
        typeof southWest.latitude === 'number' &&
        typeof southWest.longitude === 'number' &&
        typeof northEast.latitude === 'number' &&
        typeof northEast.longitude === 'number'
      ) {
        // create a rectangle using corners
        return [
          [southWest.latitude, southWest.longitude],
          [southWest.latitude, northEast.longitude],
          [northEast.latitude, northEast.longitude],
          [northEast.latitude, southWest.longitude]
        ];
      }
    }

    // If the area has a center point and radius, create a circle approximation
    if (area.center && typeof area.radius === 'number') {
      const { latitude, longitude } = area.center;
      const radius = area.radius;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        // Create a circle approximation (8 points)
        const points = [];
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          // Convert radius from meters to approximate lat/long (very rough approximation)
          const lat = latitude + (Math.sin(angle) * radius / 111000);
          const lng = longitude + (Math.cos(angle) * radius / (111000 * Math.cos(latitude * Math.PI / 180)));
          points.push([lat, lng]);
        }
        return points;
      }
    }
    console.warn("Invalid area geomeetry:", area);
    return []; // Empty array if invalid
  };

export const validateTreatmentPlan = (plan) => {
  // Basic null/undefined check
  if (!plan) {
    console.error('[ERROR] Treatment plan is missing');
    return 'Treatment plan is missing';
  }
  
  // Check plan object type
  if (typeof plan !== 'object') {
    console.error('[ERROR] Treatment plan is not an object');
    return 'Treatment plan is invalid (not an object)';
  }
  
  // Initialize areas if missing
  if (!plan.areas) {
    console.warn('[WARN] Plan missing areas property, creating empty array');
    plan.areas = [];
    return 'No treatment areas defined';
  }
  
  // Convert single area to array if needed
  if (!Array.isArray(plan.areas) && typeof plan.areas === 'object') {
    console.warn('[WARN] Plan areas is not an array, converting to array', plan.areas);
    plan.areas = [plan.areas];
  } else if (!Array.isArray(plan.areas)) {
    console.error('[ERROR] Plan areas is invalid (not array or object):', plan.areas);
    return 'Treatment areas are missing or invalid';
  }
  
  // Check if there are any areas defined
  if (plan.areas.length === 0) {
    console.warn('No treatment areas defined');
    return 'No treatment areas defined';
  }
  
  // Validate each area
  for (let i = 0; i < plan.areas.length; i++) {
    const area = plan.areas[i];
    
    // Check if area is an object
    if (!area || typeof area !== 'object') {
      console.error(`[ERROR] Area ${i + 1} is not a valid object:`, area);
      return `Area ${i + 1} is invalid`;
    }
    
    // Check for type property
    if (!area.type) {
      console.error(`Area ${i + 1} is missing type, defaulting to polygon`);
      area.type = 'polygon';
      return `Area ${i + 1} is missing type`;
    }

    let hasValidGeometry = false;
    
    // Check for valid points
    //let hasValidPoints = false;
    if (area.points) {
      if (Array.isArray(area.points)) {
        const minPoints = area.type === 'polygon' ? 3 : 2;

        if (area.points.length >= minPoints) {
          const validPoints = area.points.filter(point => 
            point && 
            typeof point === 'object' && 
            typeof point.latitude === 'number' && 
            typeof point.longitude === 'number'
          );
          
          hasValidGeometry = validPoints.length >= minPoints;
          
          if (area.points.length > 0 && validPoints.length < minPoints) {
            console.error(`[ERROR] Area ${i + 1} has points, but none are valid (${validPoints.length}/${minPoints} needed)`);
          }
        } else {
          console.warn(`Area ${i + 1} has less than 3 points`);
        }
      } else {
        console.error(`[ERROR] Area ${i + 1} points is not an array:`, area.points);
      }
    }
    
    // Check for valid bounds
    let hasValidBounds = false;
    if (area.bounds) {
      if (area.bounds.southWest && area.bounds.northEast) {
        const { southWest, northEast } = area.bounds;
        
        if (typeof southWest === 'object' && typeof northEast === 'object') {
          hasValidBounds = typeof southWest.latitude === 'number' &&
                            typeof southWest.longitude === 'number' &&
                            typeof northEast.latitude === 'number' &&
                            typeof northEast.longitude === 'number';
        } else {
          console.error(`Area ${i + 1} bounds coordinates are not objects`);
        }
      } else {
        console.error(`Area ${i + 1} bounds is missing southWest or northEast`);
      }
    }
    
    // Check for valid center & radius
    let hasValidCircle = false;
    if (area.center && typeof area.radius === 'number') {
      if (typeof area.center === 'object') {
        hasValidCircle = typeof area.center.latitude === 'number' && 
                          typeof area.center.longitude === 'number' &&
                          area.radius > 0;
      }
    }
    
    // Ensure at least one valid geometry type
    if (!hasValidPoints && !hasValidBounds && !hasValidCircle) {
      console.error(`Area ${i + 1} has invalid geometry (missing valid points, bounds, or center+radius)`);
      return `Area ${i + 1} has invalid geometry`;
    }
  }
  
  return null; // No validation errors
};

export const ensureValidTreatmentPlan = (plan) => {
  if (!plan) return null;

  const processedPlan = { ...plan };

  if (!processedPlan.id) {
    console.warn(`[WARN] Treatment plan has no ID, generating temporary ID`);
    processedPlan.id = 'temp-' + Math.random().toString(36).substring(2, 15);
  }
  // Ensure areas property exists and is an array
  if (!processedPlan.areas) {
    console.warn('[WARN] Treatment plan has no areas, adding empty array');
    processedPlan.areas = [];
  } else if (!Array.isArray(processedPlan.areas)) {
    console.warn('[WARN] Treatment plan areas is not an array, converting', processedPlan.areas);
    processedPlan.areas = [processedPlan.areas];
  }
  // Process each area to ensure it has minimum valid properties
  processedPlan.areas = processedPlan.areas.map((area, index) => {
    if (!area || typeof area !== 'object') {
      console.warn(`[WARN] Area ${index + 1} is not a valid object, creating default`);
      return {
        type: 'polygon',
        center: { latitude: 0, longitude: 0 },
        radius: 100
      };
    }

    //area has type
    if (!area.type) {
      area.type = 'polygon';
    }
    return area;
  });

  return processedPlan;
}

// Retrieve all treatment plans
export const fetchAllTreatmentPlans = async () => {
  try {
    console.log(`DEBUG] Fetching all treatment plans`);
    const response = await fetch('http://127.0.0.1:5000/treatment-plans', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[Error] Backend error response:`, errorData);
      throw new Error(errorData.message || 'Failed to fetch treatment plans');
    }
    
    const plans = await response.json();
    console.log(`[DEBUG] Retrieved ${plans.length} plans:`, plans);

    // Process plans to ensure they have the right structure
    plans.forEach((plan, index) => {
      if (!plan.areas) {
        console.warn(`[WARN] Plan ${index} has no areas property, adding empty array`);
        plan.areas = [];
      } else if (!Array.isArray(plan.areas)) {
        console.warn(`[WARN] Plan ${index} areas is not an array, converting`, plan.areas);
        plan.areas = [plan.areas];
      }
    });
    
    console.log(`[DEBUG] Processed plans:`, plans);

    return plans;
  } catch (error) {
    console.error(`[ERROR] Error fetching all treatment plans:`, error);
    throw error;
  }
};

export const debugObjectProperties = (obj, label = 'Object') => {
  console.log(`[DEBUG] ${label} structure check:`);
  if (!obj) {
    console.log(`  - ${label} is null or undefined`);
    return;
  }
  
  console.log(`  - Type: ${typeof obj}`);
  
  if (typeof obj === 'object') {
    console.log(`  - Properties: ${Object.keys(obj).join(', ')}`);
    
    if (obj.areas) {
      console.log(`  - areas type: ${typeof obj.areas}`);
      console.log(`  - areas is Array: ${Array.isArray(obj.areas)}`);
      console.log(`  - areas length: ${Array.isArray(obj.areas) ? obj.areas.length : 'N/A'}`);
      
      if (Array.isArray(obj.areas) && obj.areas.length > 0) {
        const area = obj.areas[0];
        console.log(`  - First area type: ${typeof area}`);
        console.log(`  - First area properties: ${Object.keys(area).join(', ')}`);
      }
    }
  }
};