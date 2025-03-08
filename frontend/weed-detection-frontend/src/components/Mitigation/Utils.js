
export const calculateAreaCenter = (area) => {
    if (area.center && Array.isArray(area.center) && area.center.length === 2) {
      return area.center;
    }
    
    if (area.points && Array.isArray(area.points) && area.points.length > 0) {
      // Calculate center from points
      const sumLat = area.points.reduce((sum, point) => sum + point[0], 0);
      const sumLng = area.points.reduce((sum, point) => sum + point[1], 0);
      return [sumLat / area.points.length, sumLng / area.points.length];
    }
    
    if (area.bounds && area.bounds.southWest && area.bounds.northEast) {
      // Calculate center from bounds
      return [
        (area.bounds.southWest[0] + area.bounds.northEast[0]) / 2,
        (area.bounds.southWest[1] + area.bounds.northEast[1]) / 2
      ];
    }
    
    return [0, 0]; // Default fallback
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
    if (!plan) return 'Treatment plan is missing';
    if (!plan.areas || !Array.isArray(plan.areas)) return 'Treatment areas are missing or invalid';
    if (plan.areas.length === 0) return 'No treatment areas defined';
    
    for (let i = 0; i < plan.areas.length; i++) {
      const area = plan.areas[i];
      if (!area.type) return `Area ${i + 1} is missing type`;
      
      // Check if the area has valid points or bounds
      const hasValidPoints = area.points && Array.isArray(area.points) && area.points.length >= 3;
      const hasValidBounds = area.bounds && 
                             area.bounds.southWest && 
                             area.bounds.northEast && 
                             Array.isArray(area.bounds.southWest) && 
                             Array.isArray(area.bounds.northEast) &&
                             area.bounds.southWest.length === 2 &&
                             area.bounds.northEast.length === 2;
                             
      if (!hasValidPoints && !hasValidBounds) {
        return `Area ${i + 1} has invalid geometry (missing points or bounds)`;
      }
    }
    
    return null;
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