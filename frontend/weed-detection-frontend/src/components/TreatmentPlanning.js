// File: TreatmentPlanning.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TreatmentOptions from './TreatmentOptions';
import TreatmentStats from './TreatmentStats'; 
import TreatmentMap from './TreatmentMap';
import { fetchWeedDetections, generateMockData } from './services/WeedService';
import WeedMitigation from './Mitigation/WeedMitigation';
import { 
  generateTreatmentPlan,
  calculateTreatmentStats,
  exportTreatmentPlan,
  saveTreatmentPlan
} from './services/TreatmentService';

const TreatmentPlanning = () => {
  const [weedDetections, setWeedDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState('precision');
  const [treatmentAreas, setTreatmentAreas] = useState([]);
  const [currentTreatmentPlan, setCurrentTreatmentPlan] = useState(null);
  const [mapSettings, setMapSettings] = useState({
    centerPosition: [-0.68885, 34.78321],
    zoom: 16
  });
  const [treatmentStats, setTreatmentStats] = useState({
    totalWeeds: 0,
    highDensityAreas: 0,
    estimatedChemicalUsage: 0,
    estimatedTimeRequired: 0,
    costEstimate: 0
  });

  // fetch data from backend
  useEffect(() => {
    const loadWeedDetections = async () => {
      try {
        setLoading(true);
        const data = await fetchWeedDetections();
        setWeedDetections(data);
        
        // if we have detections, center the map on the first one
        if (data.length > 0) {
          setMapSettings({
            centerPosition: [data[0].latitude, data[0].longitude],
            zoom: 17
          });
        }
        
        // calculate stats based on weed detections
        setTreatmentStats(calculateTreatmentStats(data, selectedTreatment));
      } catch (err) {
        console.error("Error fetching weed detections:", err);
        setError(err.message);
        
        // For development/demo purposes - create mock data if backend is not available
        const mockData = generateMockData();
        setWeedDetections(mockData);
        setTreatmentStats(calculateTreatmentStats(mockData, selectedTreatment));
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
    exportTreatmentPlan(currentTreatmentPlan);
  };

  const handleSavePlan = async () => {
    await saveTreatmentPlan(currentTreatmentPlan);
  };

  // Render loading state
  if (loading) {
    return <div className="loading">Loading treatment planning data...</div>;
  }

  // Render error state
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
            >
              Export Plan
            </button>
            <button 
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleSavePlan}
            >
              Save & Schedule
            </button>
          </div>
        </div>

        {/* Map Section */}
        {/*<TreatmentMap 
          weedDetections={weedDetections}
          treatmentAreas={treatmentAreas}
          centerPosition={mapSettings.centerPosition}
          zoom={mapSettings.zoom}
        />*/}
        {currentTreatmentPlan ? (
          <WeedMitigation treatmentPlan={currentTreatmentPlan} />
        ) : (
          <p className='text-red-500'>No treatment plan available.</p>
        )}
      </div>
    </div>
  );
};

export default TreatmentPlanning;