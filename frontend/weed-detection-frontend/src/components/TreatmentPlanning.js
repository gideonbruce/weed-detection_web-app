import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TreatmentOptions from './TreatmentOptions';
import TreatmentStats from './TreatmentStats'; 
import TreatmentMap from './TreatmentMap';
import { fetchWeedDetections, generateMockData } from './services/WeedService';
import WeedMitigation from './Mitigation/WeedMitigation';
import { useNavigate } from 'react-router-dom';
import { 
  generateTreatmentPlan,
  calculateTreatmentStats,
  exportTreatmentPlan,
  saveTreatmentPlan
} from './services/TreatmentService';

const COORDINATE_PRECISION = 8; // eight decimal places
const DEFAUL_CENTER = [-0.68885, 34.78321];
const DEFAULT_ZOOM = 16;

const TreatmentPlanning = () => {
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [weedDetections, setWeedDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState('precision');
  const [treatmentAreas, setTreatmentAreas] = useState([]);
  const [currentTreatmentPlan, setCurrentTreatmentPlan] = useState(null);
  const [mapSettings, setMapSettings] = useState({
    centerPosition: DEFAUL_CENTER,
    zoom: DEFAULT_ZOOM
  });

  const [treatmentStats, setTreatmentStats] = useState({
    totalWeeds: 0,
    highDensityAreas: 0,
    estimatedChemicalUsage: 0,
    estimatedTimeRequired: 0,
    costEstimate: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectWeed, setSelectedWeed] = useState(null);
  const [coordinateSystem, setCoordinateSystem] = useState('WGS84');

  const normalizeCoordinates = (detections) => {
    return detections.map(detection => ({
      ...detection,
      latitude: parseFloat(detection.latitude.toFixed(COORDINATE_PRECISION)),
      longitude: parseFloat(detection.longitude.toFixed(COORDINATE_PRECISION)),
      //adding altitude if unavailable
      altitude: detection.altitude ? parseFloat(detection.altitude.toFixed(3)) : null,
      //accuracy metrics
      accuracy: detection.accuracy || null,
      horizontalAccuracy: detection.horizontalAccuracy || null,
      verticalAccuracy: detection.verticalAccuracy || null,
      //timestamp for when coordinates was captured
      timestamp: detection.timestamp || new Date().toISOString()
    }));
  };

  // fetch data from backend
  useEffect(() => {
    const loadWeedDetections = async () => {
      try {
        setLoading(true);
        const data = await fetchWeedDetections();
        //normalize coordinates to ensure consistent precision
        const normalizedData = normalizeCoordinates(data);
        setWeedDetections(normalizedData);
        
        // if we have detections, center the map on the first one
        if (normalizedData.length > 0) {
          setMapSettings({
            centerPosition: [normalizedData[0].latitude, normalizedData[0].longitude],
            zoom: 18
          });
        }
        
        // calculate stats based on weed detections
        setTreatmentStats(calculateTreatmentStats(data, selectedTreatment));
      } catch (err) {
        console.error("Error fetching weed detections:", err);
        setError(err.message);
        
        // For development/demo purposes - create mock data if backend is not available
        const mockData = generateMockData();
        const normalizedMockData = normalizeCoordinates(mockData);
        setWeedDetections(normalizedMockData);
        setTreatmentStats(calculateTreatmentStats(normalizedMockData, selectedTreatment));
      } finally {
        setLoading(false);
      }
    };
    
    loadWeedDetections();
  }, []);

  // recalculate treatment plans when treatment method or weed data changes
  useEffect(() => {
    if (weedDetections.length > 0) {
      console.log("Weed Detections:", weedDetections);
      console.log("Selected Treatment:", selectedTreatment);

      const { areas, plan } = generateTreatmentPlan(weedDetections, selectedTreatment);
      console.log("Generate Treatment Plan:", plan);

      setTreatmentAreas(areas);
      setCurrentTreatmentPlan(plan);
      setTreatmentStats(calculateTreatmentStats(weedDetections, selectedTreatment));
    }
  }, [selectedTreatment, weedDetections]);

  const handleExportPlan = () => {
    if (!currentTreatmentPlan) {
      alert("No treatment plan to export!");
      return;
    }
    //check coordinate formatting
    const planWithPreciseCoordinates = {
      ...currentTreatmentPlan,
      weedCoordinates: currentTreatmentPlan.weedCoordinates?.map(coord => ({
        ...coord,
        latitude: parseFloat(coord.latitude.toFixed(COORDINATE_PRECISION)),
        longitude: parseFloat(coord.longitude.toFixed(COORDINATE_PRECISION))
      }))
    };
    exportTreatmentPlan(planWithPreciseCoordinates);
  };

  const handleSavePlan = async () => {
    if (!currentTreatmentPlan) {
      alert("No treatment plan to save!");
      return;
    }

    try {
      setIsSaving(true);

      console.log("Saving treatment plan:", currentTreatmentPlan);

      const savedPlan = await saveTreatmentPlan(currentTreatmentPlan);
      console.log("Saved plan Response:", savedPlan);

      setCurrentTreatmentPlan(savedPlan);

      alert('Treatment plan saved successfully!');

      const goToMitigation = window.confirm(
        "Treatment plan saved successfully! Would you like to proceed to mitigation?"
      );

      if (goToMitigation) {
        navigate(`/mitigation`);
      }
    } catch (error) {
      console.error("Error saving treatment plan:", error);
      alert(`Failed to save treatment plan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // render loading state
  if (loading) {
    return <div className="loading">Loading treatment planning data...</div>;
  }

  // render error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Error loading weed detection data</h2>
        <p>{error}</p>
        <p>Using mock data for demonstration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-white p-4 shadow-md rounded-lg mb-6">
        <h1 className="text-xl font-bold text-gray-800">Treatment Planning</h1>
        <div className="flex gap-4">
          <Link to="/weeds-detected" className="text-blue-600 hover:underline">View Weed Detections</Link>
          <Link to="/farm" className="text-blue-600 hover:underline">Back to Mapping</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Options & Stats Section */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <TreatmentOptions 
            selectedTreatment={selectedTreatment} 
            onSelectTreatment={setSelectedTreatment} 
          />
          
          <TreatmentStats stats={treatmentStats} />
          
          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button 
              className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={handleExportPlan}
              disabled={!currentTreatmentPlan || isSaving}
            >
              Export Plan
            </button>
            <button 
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleSavePlan}
              disabled={!currentTreatmentPlan || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save & Schedule'}
            </button>
          </div>

          {currentTreatmentPlan && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <h3 className="font-medium">Treatment Plan Info</h3>
              <p className="text-sm">ID: {currentTreatmentPlan.id}</p>
              <p className="text-sm">Method: {currentTreatmentPlan.method}</p>
              <p className="text-sm">Created: {new Date(currentTreatmentPlan.createdAt).toLocaleString()}</p>
              <p className="text-sm">Status: {currentTreatmentPlan.status}</p>
            </div>
          )}
        </div>

        {/* Map Section */}
        <TreatmentMap 
          weedDetections={weedDetections}
          treatmentAreas={treatmentAreas}
          centerPosition={mapSettings.centerPosition}
          zoom={mapSettings.zoom}
        />
      </div>
    </div>
  );
};

export default TreatmentPlanning;