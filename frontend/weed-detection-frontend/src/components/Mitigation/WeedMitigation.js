import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TreatmentMap } from './TreatmentMap';
import { TreatmentTable } from './TreatmentTable';
import { TreatmentStatus } from './TreatmentStatus';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { 
  validateTreatmentPlan, 
  calculateAreaCenter, 
  calculatePolygonPoints,
  fetchTreatmentPlanById,
  updateTreatmentPlanStatus,
  fetchAllTreatmentPlans,
  sendTreatmentCommand,
  debugObjectProperties,
  ensureValidTreatmentPlan
} from './Utils';

const WeedMitigation = ({ treatmentPlanProp, planIdProp }) => {
  const { planId: urlPlanId } = useParams();
  const navigate = useNavigate();

  const planId = planIdProp || urlPlanId;
  
  const [treatmentPlan, setTreatmentPlan] = useState(treatmentPlanProp || null);
  const [treatmentProgress, setTreatmentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerPosition, setCenterPosition] = useState([-0.68885, 34.78321]);
  const [zoom, setZoom] = useState(16);
  const [treatmentStatus, setTreatmentStatus] = useState('pending'); // pending, inProgress, completed, error
  const [statusMessage, setStatusMessage] = useState('');

  // debug logging for component initialization
  useEffect(() => {
    console.log("[DEBUG] WeedMitigation component initialized");
    console.log("[DEBUG] planId:", planId);
    console.log("[DEBUG] treatmentPlanProp:", treatmentPlanProp);
  }, [planId, treatmentPlanProp]);
  
  
  // Fetching the treatment plan from the database if it was not passed as a prop
  useEffect(() => {
    const loadTreatmentPlan = async () => {
      console.log("[DEBUG] loadTreatmentPlan called");
      
      // if we already have a treatment plan from props, use it
      if (treatmentPlanProp) {
        console.log("[DEBUG] Using treatment plan from props");
        debugObjectProperties(treatmentPlanProp, "treatmentPlanProp");
        
        //  plan structure
        const processedPlan = ensureValidTreatmentPlan(treatmentPlanProp);

        if (!processedPlan.areas) {
          console.warn("[WARN] Treatment plan from props has no areas, adding empty array");
          processedPlan.areas = [];
        } else if (!Array.isArray(processedPlan.areas)) {
          console.warn("[WARN] Treatment plan from props has non-array areas, converting", processedPlan.areas);
          processedPlan.areas = [processedPlan.areas];
        }
        
        setTreatmentPlan(processedPlan);
        setLoading(false);
        return;
      }
      
      // ... if not, try to load it from the database using the planId from the URL
      if (!planId) {
        try {
          console.log("[DEBUG] No planId provided, attempting to fetch all plans");
          setLoading(true);
          const allPlans = await fetchAllTreatmentPlans();

          if (!allPlans || allPlans.length === 0) {
            console.error("[ERROR] No treatment plans found in the database");
            setError("No treatment plans found in the database.");
            setLoading(false);
            return;
          }

          console.log("[DEBUG] Using first plan from list:", allPlans[0]);
          const firstPlan = allPlans[0];
          
          // Ensure the plan has the required structure
          if (!firstPlan.areas) {
            console.warn("[WARN] First plan has no areas, adding empty array");
            firstPlan.areas = [];
          } else if (!Array.isArray(firstPlan.areas)) {
            console.warn("[WARN] First plan has non-array areas, converting", firstPlan.areas);
            firstPlan.areas = [firstPlan.areas];
          }
          
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
          console.error('[ERROR] Error loading treatment plans:', err);
          setError("No treatment plan ID provided and failed to load default plan.");
          setLoading(false);
        }
        return;
      }
      
      try {
        console.log(`[DEBUG] Fetching treatment plan with ID: ${planId}`);
        setLoading(true);

        const fetchedPlan = await fetchTreatmentPlanById(planId, true); //cache busting parameter
        
        if (!fetchedPlan) {
          console.error(`[ERROR] Treatment plan with ID ${planId} not found`);
          throw new Error(`Treatment plan with ID ${planId} not found.`);
        }
        
        console.log(`[DEBUG] Fetched plan:`, fetchedPlan);
        debugObjectProperties(fetchedPlan, "fetchedPlan");

        const processedPlan = ensureValidTreatmentPlan(fetchedPlan);
        
        // Ensure the plan has the required structure
        if (!fetchedPlan.areas) {
          console.warn("[WARN] Fetched plan has no areas, adding empty array");
          fetchedPlan.areas = [];
        } else if (!Array.isArray(fetchedPlan.areas)) {
          console.warn("[WARN] Fetched plan has non-array areas, converting", fetchedPlan.areas);
          fetchedPlan.areas = [fetchedPlan.areas];
        }
        
        setTreatmentPlan(fetchedPlan);
        
        // Set initial status based on the plan's status
        if (fetchedPlan.status === 'completed') {
          setTreatmentStatus('completed');
          setTreatmentProgress(100);
          setStatusMessage('This treatment has already been completed.');
        } else if (fetchedPlan.status === 'in-progress') {
          setTreatmentStatus('inProgress');
          setTreatmentProgress(50); // assuming 50% complete if already in progress
          setStatusMessage('Treatment is currently in progress.');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[ERROR] Error loading treatment plan:', err);
        setError(err.message || 'Failed to load treatment plan');
        setLoading(false);
      }
    };

    loadTreatmentPlan();
  }, [planId, treatmentPlanProp]);

  useEffect(() => {
    const initializeTreatmentPlan = async () => {
      console.log("[DEBUG] initializeTreatmentPlan called");
      if (!treatmentPlan) {
        console.log("[DEBUG] No treatment plan available yet");
        return;
      }
      
      console.log("[DEBUG] Initializing treatment plan:", treatmentPlan);
      debugObjectProperties(treatmentPlan, "treatmentPlan in initialize");
      
      try {
        const validationError = validateTreatmentPlan(treatmentPlan);
        
        if (validationError) {
          console.error(`[ERROR] Treatment plan validation failed: ${validationError}`);
          setError(validationError);
          return;
        }

        console.log("[DEBUG] Treatment plan validation successful");

        // find a valid area to center the map on
        if (!Array.isArray(treatmentPlan.areas)) {
          console.error("[ERROR] treatmentPlan.areas is not an array:", treatmentPlan.areas);
          setError("Treatment plan areas is not an array");
          return;
        }

        const validAreas = treatmentPlan.areas.filter(area => 
          (area.points && area.points.length > 0) || 
          (area.bounds && area.bounds.southWest && area.bounds.northEast)
        );
        
        console.log(`[DEBUG] Found ${validAreas.length} valid areas`);
        
        if (validAreas.length > 0) {
          const centerCoords = calculateAreaCenter(validAreas[0]);
          console.log(`[DEBUG] Setting center position to: [${centerCoords[0]}, ${centerCoords[1]}]`);
          setCenterPosition(centerCoords);
          setZoom(17);
        } else {
          console.warn("[WARN] No valid areas to center map on");
          setCenterPosition([-0.68885, 34.78321]);
        }
      } catch (err) {
        console.error('[ERROR] Error initializing treatment plan:', err);
        setError('Failed to initialize treatment plan: ' + err.message);
      }
    };

    initializeTreatmentPlan();
  }, [treatmentPlan]);

  const handleStartTreatment = async () => {
    console.log("[DEBUG] handleStartTreatment called");
    if (!treatmentPlan || !treatmentPlan.id) {
      console.error("[ERROR] Cannot start treatment: Invalid treatment plan");
      setError("Cannot start treatment: Invalid treatment plan.");
      return;
    }

    try {
      // update the plan status in the database first
      console.log(`[DEBUG] Updating treatment plan ID ${treatmentPlan.id}, type:${typeof treatmentPlan.id}`);

      console.log(`[DEBUG] Updating treatment plan ${treatmentPlan.id} status to in-progress`);
      await updateTreatmentPlanStatus(treatmentPlan.id, 'in-progress');
      
      setTreatmentStatus('inProgress');
      setStatusMessage('Sending treatment command...');
      setTreatmentProgress(10);
      
      // simulate progress updates
      const progressInterval = setInterval(() => {
        setTreatmentProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 1000);
      
      console.log("[DEBUG] Sending treatment command");
      const result = await sendTreatmentCommand(treatmentPlan);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        console.log("[DEBUG] Treatment command successful");
        // updating the plan status to completed in the database
        await updateTreatmentPlanStatus(treatmentPlan.id, 'completed');
        
        setTreatmentProgress(100);
        setTreatmentStatus('completed');
        setStatusMessage(result.message || 'Treatment completed successfully!');
      } else {
        console.error("[ERROR] Treatment command failed:", result.message);
        // updating the plan status to indicate an error
        await updateTreatmentPlanStatus(treatmentPlan.id, 'error');
        
        setTreatmentStatus('error');
        setStatusMessage(result.message || 'Treatment failed with an unknown error.');
      }
    } catch (err) {
      console.error('[ERROR] Error during treatment execution:', err);
      setTreatmentStatus('error');
      setStatusMessage(`An unexpected error occurred: ${err.message}`);
      setTreatmentProgress(0);
    }
  };

  const handleRetry = () => {
    console.log("[DEBUG] handleRetry called");
    setTreatmentStatus('pending');
    setStatusMessage('');
    setTreatmentProgress(0);
  };

  if (loading) {
    console.log("[DEBUG] Rendering loading state");
    return <LoadingState />;
  }

  if (error) {
    console.log(`[DEBUG] Rendering error state: ${error}`);
    return <ErrorState error={error} />;
  }

  console.log("[DEBUG] Rendering WeedMitigation component");
  console.log("[DEBUG] Current treatment plan:", treatmentPlan);
  debugObjectProperties(treatmentPlan, "treatmentPlan in render");

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

        {treatmentPlan && Array.isArray(treatmentPlan.areas) && treatmentPlan.areas.length > 0 && (
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