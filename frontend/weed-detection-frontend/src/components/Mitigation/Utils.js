/**
 * Calculates the center of a treatment area
 * @param {Object} area - The treatment area object
 * @returns {Array} - [Latitude, longitude] pair for the center
 */

export const calculateAreaCenter = (area) => {
  // if area has explicit center use it
    if (area.center && typeof area.center.latitude === 'number' && typeof area.center.longitude === 'number') {
      return [area.center.latitude, area.center.longitude];
    }

    // if area has bounds use center of th ebounds
    if (area.points && area.bounds.southWest && area.bounds.northEast) {
       const { southWest, northEast } = area.bounds;
       return [
        (southWest.latitude + northEast.latitude) / 2,
        (southWest.longitude + northEast.longitude) /2
       ];
    }
    // if area has points, calculate the centroid
    if (area.points && Array.isArray(area.points) && area.points.length > 0) {
      const validPoints = area.points.filter(point =>
        point && typeof point.latitude === 'number' && typeof point.longitude === 'number'
      );
      if (validPoints.length > 0) {
        const sumLat = validPoints.reduce((sum, point) => sum + point.latitude, 0);
        const sumLng = validPoints.reduce((sum, point) => sum + point.longitude, 0);
        return [sumLat / validPoints.length, sumLng / validPoints.length];
      }
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
    if (!plan) { console.error('Treatment plan is missing'); return 'Treatment plan is missing'; }
    if (typeof plan !== 'object') {
      console.error('Treatment plan is not an object');
      return 'Treatment plan is invalid (not an object)';
    }
    if (typeof plan !== 'object') {
      console.error('Treatment plan is not an object');
      return 'Treatment plan is invalid (not an object)';
    }
    if (!plan.areas) {
      console.warn('Plan missing areas property, creating empty array');
      plan.areas = [];
    }
    if (!plan.areas || !Array.isArray(plan.areas))
       return 'Treatment areas are missing or invalid';
    if (plan.areas.length === 0) {
      console.warn('No treatment areas defined');
      return 'No treatment areas defined';
    }
    

    for (let i = 0; i < plan.areas.length; i++) {
      const area = plan.areas[i];
      if (!area.type) return `Area ${i + 1} is missing type`;
      
      // Check if the area has valid points or bounds
      const hasValidPoints = area.points && Array.isArray(area.points) && area.points.length >= 3;
      const hasValidBounds = area.bounds && 
                             area.bounds.southWest && 
                             area.bounds.northEast && 
                             typeof area.bounds.southWest.latitude === 'number' &&
                             typeof area.bounds.southWest.longitude === 'number' &&
                             typeof area.bounds.northEast.latitude === 'number' &&
                             typeof area.bounds.northEast.longitude === 'number';
                             
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