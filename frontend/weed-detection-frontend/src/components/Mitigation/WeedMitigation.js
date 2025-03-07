import React, { useState, useEffect } from 'react';
import { TreatmentMap } from './TreatmentMap';
import { TreatmentTable } from './TreatmentTable';
import { TreatmentStatus } from './TreatmentStatus';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { sendTreatmentCommand } from './api';
import { 
  validateTreatmentPlan, 
  calculateAreaCenter, 
  calculatePolygonPoints 
} from './Utils';

const WeedMitigation = ({ treatmentPlan }) => {
  const [treatmentProgress, setTreatmentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerPosition, setCenterPosition] = useState([0, 0]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStatus, setTreatmentStatus] = useState('pending'); // pending, inProgress, completed, error
  const [statusMessage, setStatusMessage] = useState('');

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
  }, [treatmentPlan]);

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
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Weed Mitigation</h2>

        <TreatmentStatus 
          treatmentStatus={treatmentStatus}
          statusMessage={statusMessage}
          treatmentProgress={treatmentProgress}
          handleStartTreatment={handleStartTreatment}
          handleRetry={handleRetry}
          isStartDisabled={!treatmentPlan || !treatmentPlan.areas || treatmentPlan.areas.length === 0}
        />

        {treatmentPlan && treatmentPlan.areas && treatmentPlan.areas.length > 0 && (
          <TreatmentMap 
            areas={treatmentPlan.areas}
            centerPosition={centerPosition}
            zoom={zoom}
            calculatePolygonPoints={calculatePolygonPoints}
          />
        )}
        
        {treatmentPlan && treatmentPlan.areas && (
          <TreatmentTable 
            areas={treatmentPlan.areas}
            calculatePolygonPoints={calculatePolygonPoints}
          />
        )}
      </div>
    </div>
  );
};

export default WeedMitigation;