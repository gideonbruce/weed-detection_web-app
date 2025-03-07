import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mock function to simulate sending treatment commands to backend
const sendTreatmentCommand = async (treatmentPlan) => {
  try {
    // Simulate API call
    console.log('Sending treatment command:', treatmentPlan);
    // Replace with actual API call
    // await fetch('http://your-backend/start_treatment', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(treatmentPlan),
    // });
    return { success: true, message: 'Treatment command sent successfully' };
  } catch (error) {
    console.error('Error sending treatment command:', error);
    return { success: false, message: 'Failed to send treatment command' };
  }
};

const WeedMitigation = ({ treatmentPlan }) => {
  const [treatmentProgress, setTreatmentProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerPosition, setCenterPosition] = useState([-0.68885, 34.78321]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStatus, setTreatmentStatus] = useState('pending'); // pending, inProgress, completed, error

  useEffect(() => {
    if (treatmentPlan && treatmentPlan.areas && treatmentPlan.areas.length > 0) {
      setLoading(false);
      setCenterPosition(treatmentPlan.areas[0].center || [treatmentPlan.areas[0].bounds.southWest[0], treatmentPlan.areas[0].bounds.southWest[1]]);
      setZoom(17);
    } else {
      setLoading(false);
      setError('No treatment plan available.');
    }
  }, [treatmentPlan]);

  const handleStartTreatment = async () => {
    setTreatmentStatus('inProgress');
    const result = await sendTreatmentCommand(treatmentPlan);
    if (result.success) {
      setTreatmentStatus('completed');
      alert('Treatment completed successfully!');
    } else {
      setTreatmentStatus('error');
      alert('Treatment failed. Please check console for errors.');
    }
  };

  if (loading) {
    return <div>Loading Weed Mitigation...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Weed Mitigation</h2>

        {treatmentStatus === 'pending' && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleStartTreatment}
          >
            Start Treatment
          </button>
        )}

        {treatmentStatus === 'inProgress' && (
          <p>Treatment in progress...</p>
        )}

        {treatmentStatus === 'completed' && (
          <p>Treatment completed.</p>
        )}

        {treatmentStatus === 'error' && (
          <p>Treatment failed.</p>
        )}

        {treatmentPlan && treatmentPlan.areas && (
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
              {treatmentPlan.areas.map((area, index) => (
                <Polygon
                  key={`area-${index}`}
                  positions={area.points || [
                    [area.bounds.southWest[0], area.bounds.southWest[1]],
                    [area.bounds.southWest[0], area.bounds.northEast[1]],
                    [area.bounds.northEast[0], area.bounds.northEast[1]],
                    [area.bounds.northEast[0], area.bounds.southWest[1]],
                  ]}
                  pathOptions={{ color: area.type === 'broadcast' ? 'red' : 'orange', fillOpacity: 0.3 }}
                />
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeedMitigation;