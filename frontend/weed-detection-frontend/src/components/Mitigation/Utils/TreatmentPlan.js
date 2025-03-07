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