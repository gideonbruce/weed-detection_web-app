import React, { useState, useEffect, useRef } from 'react';
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

const COORDINATE_PRECISION = 8; 
const DEFAUL_CENTER = [0.6651262415651624, 35.2378296522736];
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
    centerPosition: [0.6651262415651624, 35.2378296522736],
    zoom: 16
  });

  const [treatmentStats, setTreatmentStats] = useState({
    totalWeeds: 0,
    highDensityAreas: 0,
    estimatedChemicalUsage: 0,
    estimatedTimeRequired: 0,
    costEstimate: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWeed, setSelectedWeed] = useState(null);
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
        console.log('Fetched weed detections:', data); // Debug log
        
        // Filter for pending weeds
        const pendingWeeds = data.filter(weed => weed.mitigation_status === 'pending');
        console.log('Pending weeds:', pendingWeeds); // Debug log
        
        setWeedDetections(pendingWeeds);
        
        // if we have detections, center the map on the first one
        if (pendingWeeds.length > 0) {
          setMapSettings({
            centerPosition: [pendingWeeds[0].latitude, pendingWeeds[0].longitude],
            zoom: 17
          });
        }
        
        // calculate stats based on pending weed detections
        setTreatmentStats(calculateTreatmentStats(pendingWeeds, selectedTreatment));
      } catch (err) {
        console.error("Error fetching weed detections:", err);
        setError(err.message);
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
      //ensuring proper formatting of coordinates
      const planWithPreciseCoordinates = {
        ...currentTreatmentPlan,
        coordinateSystem: coordinateSystem,
        weedCoordinates: currentTreatmentPlan.weedCoordinates?.map(coord => ({
          ...coord,
          latitude: parseFloat(coord.latitude.toFixed(COORDINATE_PRECISION)),
          longitude: parseFloat(coord.longitude.toFixed(COORDINATE_PRECISION))
        }))
      }

      console.log("Saving treatment plan:", planWithPreciseCoordinates);

      const savedPlan = await saveTreatmentPlan(planWithPreciseCoordinates);
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

  //view detailed coordinates of a specific weed detection
  const handleSelectWeed = (weed) => {
    setSelectedWeed(weed);
  };
  //coordinate system change
  const handleCoordinateSystemChange = (system) => {
    setCoordinateSystem(system);
  }

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

          { /*Coordinate System Selector */}
          <div className='mt-4'>
            <h3 className='font-medium'>Coordinate System</h3>
            <div className='flex gap-3 mt-2'>
              <button
                className={`px-2 py-1 text-sm rounded ${coordinateSystem === 'WGS84' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => handleCoordinateSystemChange('WGS84')}
              >
                WGS84 (GPS)
              </button>
              <button 
                className={`px-2 py-1 text-sm rounded ${coordinateSystem === 'UTM' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => handleCoordinateSystemChange('UTM')}
              >
                UTM
              </button>
              <button 
                className={`px-2 py-1 text-sm rounded ${coordinateSystem === 'LOCAL' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                onClick={() => handleCoordinateSystemChange('LOCAL')}
              >
                Local Grid
              </button>
            </div>
          </div>
          
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
              <p className="text-sm">Coordinate system: {coordinateSystem}</p>
            </div>
          )}

          {/* Selected Weed Details */}
          {selectedWeed && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between">
                <h3 className="font-medium">Selected Weed Details</h3>
                <button className="text-sm text-gray-500" onClick={() => setSelectedWeed(null)}>×</button>
              </div>
              <table className="w-full text-sm mt-2">
                <tbody>
                  <tr>
                    <td className="font-medium">Latitude:</td>
                    <td className="text-right font-mono">{selectedWeed.latitude.toFixed(COORDINATE_PRECISION)}°</td>
                  </tr>
                  <tr>
                    <td className="font-medium">Longitude:</td>
                    <td className="text-right font-mono">{selectedWeed.longitude.toFixed(COORDINATE_PRECISION)}°</td>
                  </tr>
                  {selectedWeed.altitude && (
                    <tr>
                      <td className="font-medium">Altitude:</td>
                      <td className="text-right font-mono">{selectedWeed.altitude.toFixed(2)} m</td>
                    </tr>
                  )}
                  {selectedWeed.accuracy && (
                    <tr>
                      <td className="font-medium">Accuracy:</td>
                      <td className="text-right">{selectedWeed.accuracy.toFixed(2)} m</td>
                    </tr>
                  )}
                  <tr>
                    <td className="font-medium">Detected:</td>
                    <td className="text-right">{new Date(selectedWeed.timestamp).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Map Section */}
        <TreatmentMap 
          ref={mapRef}
          weedDetections={weedDetections}
          treatmentAreas={treatmentAreas}
          centerPosition={mapSettings.centerPosition}
          zoom={mapSettings.zoom}
          onSelectWeed={handleSelectWeed}
          selectedWeed={selectedWeed}
          coordinateSystem={coordinateSystem}
        />
      </div>
    </div>
  );
};

export default TreatmentPlanning;