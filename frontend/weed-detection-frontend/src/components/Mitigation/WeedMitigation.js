import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TreatmentMap } from './TreatmentMap';
import { TreatmentTable } from './TreatmentTable';
import { TreatmentStatus } from './TreatmentStatus';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { sendTreatmentCommand } from './api';
import { 
  validateTreatmentPlan, 
  calculateAreaCenter, 
  calculatePolygonPoints,
  fetchTreatmentPlanById,
  updateTreatmentPlanStatus,
  fetchAllTreatmentPlans
} from './Utils';

const WeedMitigation = ({ treatmentPlanProp, planIdProp }) => {
  const { planId: urlPlanId } = useParams();
  const navigate = useNavigate();

  const planId = planIdProp || urlPlanId;
  
  const [treatmentPlan, setTreatmentPlan] = useState(treatmentPlanProp || null);
  const [treatmentProgress, setTreatmentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerPosition, setCenterPosition] = useState([0, 0]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStatus, setTreatmentStatus] = useState('pending'); // pending, inProgress, completed, error
  const [statusMessage, setStatusMessage] = useState('');


  const updateTreatmentPlanStatus = async (planId, status) => {
    try {
      const response = await fetch(`/api/treatment-plans/${planId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
  
      if (!response.ok) throw new Error("Failed to update treatment status");
    } catch (err) {
      console.error("Error updating treatment status:", err);
      throw err;
    }
  };
  
  const fetchTreatmentPlanById = async (planId) => {
    try {
      const response = await fetch(`/treatment-plans/${planId}`);
      if (!response.ok) throw new Error("Failed to fetch treatment plan");

      const data = await response.json();

      if (!data.areas) {
        data.areas = [];
      } else if (!Array.isArray(data.areas)) {
        data.areas = [data.areas];
      }
      return data;
    } catch (err) {
      console.error("Error fetching treatment plan:", err);
      throw err;
    }
  };
  
  // Fetch the treatment plan from the database if it was not passed as a prop
  useEffect(() => {
    const loadTreatmentPlan = async () => {
      // If we already have a treatment plan from props, use it
      if (treatmentPlanProp) {
        if (!treatmentPlanProp.areas) {
          treatmentPlanProp.areas = [];
        } else if (!Array.isArray(treatmentPlanProp.areas)) {
          treatmentPlanProp.areas = [treatmentPlanProp.areas];
        }
        setTreatmentPlan(treatmentPlanProp);
        setLoading(false);
        return;
      }
      
      // Otherwise, try to load it from the database using the planId from the URL
      if (!planId) {
        try {
          setLoading(true);
          const allPlans = await fetchAllTreatmentPlans();

          if (!allPlans || allPlans.length === 0) {
            setError("No treatment plans found in the database.");
            setLoading(false);
            return;
          }

          const firstPlan = allPlans[0];
          setTreatmentPlan(firstPlan);

          if (firstPlan.status === 'completed') {
            setTreatmentStatus('completed');
            setTreatmentProgress(100);
            setStatusMessage('This treatment has already been completed.');
          } else if (firstPlan.status === 'in-progress') {
            setTreatmentStatus('inProgress');
            setTreatmentProgress(50);
            setStatusMessage('Treatment is currently in progress.');
          }
          setLoading(false);
        } catch (err) {
          console.error('Error loading treatment plans:', err);
          setError("No treatment plan ID provided and failed to load default plan.");
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        const fetchedPlan = await fetchTreatmentPlanById(planId);
        
        if (!fetchedPlan) {
          throw new Error(`Treatment plan with ID ${planId} not found.`);
        }
        
        setTreatmentPlan(fetchedPlan);
        
        // Set initial status based on the plan's status
        if (fetchedPlan.status === 'completed') {
          setTreatmentStatus('completed');
          setTreatmentProgress(100);
          setStatusMessage('This treatment has already been completed.');
        } else if (fetchedPlan.status === 'in-progress') {
          setTreatmentStatus('inProgress');
          setTreatmentProgress(50); // Assume 50% complete if already in progress
          setStatusMessage('Treatment is currently in progress.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading treatment plan:', err);
        setError(err.message || 'Failed to load treatment plan');
        setLoading(false);
      }
    };

    loadTreatmentPlan();
  }, [planId, treatmentPlanProp]);

  useEffect(() => {
    const initializeTreatmentPlan = async () => {
      if (!treatmentPlan) return;
      
      try {
        const validationError = validateTreatmentPlan(treatmentPlan);
        
        if (validationError) {
          setError(validationError);
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
      } catch (err) {
        console.error('Error initializing treatment plan:', err);
        setError('Failed to initialize treatment plan: ' + err.message);
      }
    };

    initializeTreatmentPlan();
  }, [treatmentPlan]);

  const handleStartTreatment = async () => {
    if (!treatmentPlan || !treatmentPlan.id) {
      setError("Cannot start treatment: Invalid treatment plan.");
      return;
    }

    try {
      // Update the plan status in the database first
      await updateTreatmentPlanStatus(treatmentPlan.id, 'in-progress');
      
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
        // Update the plan status to completed in the database
        await updateTreatmentPlanStatus(treatmentPlan.id, 'completed');
        
        setTreatmentProgress(100);
        setTreatmentStatus('completed');
        setStatusMessage(result.message || 'Treatment completed successfully!');
      } else {
        // Update the plan status to indicate an error
        await updateTreatmentPlanStatus(treatmentPlan.id, 'error');
        
        setTreatmentStatus('error');
        setStatusMessage(result.message || 'Treatment failed with an unknown error.');
      }
    } catch (err) {
      console.error('Error during treatment execution:', err);
      setTreatmentStatus('error');
      setStatusMessage(`An unexpected error occurred: ${err.message}`);
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

        {treatmentPlan && Array.isArray (treatmentPlan.areas) && treatmentPlan.areas.length > 0 && (
          <TreatmentMap 
            areas={treatmentPlan.areas}
            centerPosition={centerPosition}
            zoom={zoom}
            calculatePolygonPoints={calculatePolygonPoints}
          />
        )}
        
        {treatmentPlan && Array.isArray(treatmentPlan.areas) && (
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