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