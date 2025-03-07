
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
  