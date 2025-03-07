import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Mock function to simulate sending treatment commands to backend
const sendTreatmentCommand = async (treatmentPlan) => {
  try {
    // Simulate API call
    console.log('Sending treatment command:', treatmentPlan);
    // Replace with actual API call
    // const response = await fetch('http://your-backend/start_treatment', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(treatmentPlan),
    // });
    // const data = await response.json();
    // return data;
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, message: 'Treatment command sent successfully' };
  } catch (error) {
    console.error('Error sending treatment command:', error);
    return { success: false, message: 'Failed to send treatment command' };
  }
};

// Component to recenter the map when coordinates change
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  return null;
};

const WeedMitigation = ({ treatmentPlan }) => {
  const [treatmentProgress, setTreatmentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerPosition, setCenterPosition] = useState([0, 0]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStatus, setTreatmentStatus] = useState('pending'); // pending, inProgress, completed, error
  const [statusMessage, setStatusMessage] = useState('');

  // Validate treatment plan
  const validateTreatmentPlan = useCallback((plan) => {
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
  }, []);
  
  // Calculate area center
  const calculateAreaCenter = useCallback((area) => {
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
  }, []);
  
  // Calculate polygon points from area
  const calculatePolygonPoints = useCallback((area) => {
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
  }, []);

  useEffect(() => {
    const initializeTreatmentPlan = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const validationError = validateTreatmentPlan(treatmentPlan);
        
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }
        
        // Find a valid area to center the map on
        const validAreas = treatmentPlan.areas.filter(area => 
          (area.points && area.points.length > 0) || 
          (area.bounds && area.bounds.southWest && area.bounds.northEast)
        );
        
        if (validAreas.length > 0) {
          const centerCoords = calculateAreaCenter(validAreas[0]);
          setCenterPosition(centerCoords);
          setZoom(17);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing treatment plan:', err);
        setError('Failed to initialize treatment plan. See console for details.');
        setLoading(false);
      }
    };
    
    initializeTreatmentPlan();
  }, [treatmentPlan, validateTreatmentPlan, calculateAreaCenter]);

  const handleStartTreatment = async () => {
    try {
      setTreatmentStatus('inProgress');
      setStatusMessage('Sending treatment command...');
      setTreatmentProgress(10);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setTreatmentProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 1000);
      
      const result = await sendTreatmentCommand(treatmentPlan);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        setTreatmentProgress(100);
        setTreatmentStatus('completed');
        setStatusMessage(result.message || 'Treatment completed successfully!');
      } else {
        setTreatmentStatus('error');
        setStatusMessage(result.message || 'Treatment failed with an unknown error.');
      }
    } catch (err) {
      console.error('Error during treatment execution:', err);
      setTreatmentStatus('error');
      setStatusMessage('An unexpected error occurred. Please try again.');
      setTreatmentProgress(0);
    }
  };

  const handleRetry = () => {
    setTreatmentStatus('pending');
    setStatusMessage('');
    setTreatmentProgress(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading Weed Mitigation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Weed Mitigation</h2>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-red-700 font-medium">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Weed Mitigation</h2>

        <div className="mb-6">
          {treatmentStatus === 'pending' && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={handleStartTreatment}
              disabled={!treatmentPlan || !treatmentPlan.areas || treatmentPlan.areas.length === 0}
            >
              Start Treatment
            </button>
          )}

          {treatmentStatus === 'inProgress' && (
            <div>
              <p className="mb-2">{statusMessage}</p>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
                  style={{ width: `${treatmentProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{treatmentProgress}% Complete</p>
            </div>
          )}

          {treatmentStatus === 'completed' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-green-700 font-medium">Success</h3>
              <p className="text-green-600">{statusMessage}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={handleRetry}
              >
                Start New Treatment
              </button>
            </div>
          )}

          {treatmentStatus === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-red-700 font-medium">Error</h3>
              <p className="text-red-600">{statusMessage}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {treatmentPlan && treatmentPlan.areas && treatmentPlan.areas.length > 0 && (
          <div className="border rounded-lg overflow-hidden mt-4">
            <MapContainer
              center={centerPosition}
              zoom={zoom}
              style={{ height: '400px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapUpdater center={centerPosition} zoom={zoom} />
              
              {treatmentPlan.areas.map((area, index) => {
                const polygonPoints = calculatePolygonPoints(area);
                if (polygonPoints.length === 0) return null;
                
                return (
                  <Polygon
                    key={`area-${index}`}
                    positions={polygonPoints}
                    pathOptions={{ 
                      color: area.type === 'broadcast' ? 'red' : 'orange', 
                      fillOpacity: 0.3,
                      weight: 2
                    }}
                  />
                );
              })}
            </MapContainer>
          </div>
        )}
        
        {treatmentPlan && treatmentPlan.areas && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-800 mb-2">Treatment Areas</h3>
            <div className="border rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {treatmentPlan.areas.map((area, index) => {
                    // Calculate approximate area size
                    const polygonPoints = calculatePolygonPoints(area);
                    let size = "Unknown";
                    if (area.size) {
                      size = typeof area.size === 'number' ? `${area.size.toFixed(2)} sq m` : area.size;
                    } else if (area.bounds) {
                      const width = Math.abs(area.bounds.northEast[1] - area.bounds.southWest[1]);
                      const height = Math.abs(area.bounds.northEast[0] - area.bounds.southWest[0]);
                      // Very rough approximation
                      size = `~${(width * height * 111319).toFixed(2)} sq m`;
                    }
                    
                    return (
                      <tr key={`area-row-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            area.type === 'broadcast' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {area.type || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeedMitigation;