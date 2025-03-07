
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
    if (area.points && Array.isArray(area.points) && area.points.length >= 3) {
      return area.points;
    }
    
    if (area.bounds && area.bounds.southWest && area.bounds.northEast) {
      return [
        [area.bounds.southWest[0], area.bounds.southWest[1]],
        [area.bounds.southWest[0], area.bounds.northEast[1]],
        [area.bounds.northEast[0], area.bounds.northEast[1]],
        [area.bounds.northEast[0], area.bounds.southWest[1]]
      ];
    }
    
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