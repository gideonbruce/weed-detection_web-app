// Fetch weed detections from backend
export const fetchWeedDetections = async () => {
    const response = await fetch('http://127.0.0.1:5000/get_detections');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  };
  
  // Generate mock data for development/demo
  export const generateMockData = () => {
    const baseLat = -0.68885;
    const baseLng = 34.78321;
    const mockData = [];
    
    // generate 50 random weed detections around the base position
    for (let i = 0; i < 50; i++) {
      const latOffset = (Math.random() - 0.5) * 0.01;
      const lngOffset = (Math.random() - 0.5) * 0.01;
      
      mockData.push({
        id: i + 1,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        confidence: Math.round(70 + Math.random() * 30),
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      });
    }
    
    return mockData;
  };