export const sendTreatmentCommand = async (treatmentPlan) => {
    try {
      // Simulate API call
      console.log('Sending treatment command:', treatmentPlan);
      // Replace with actual API call
      const response = await fetch('http://127.0.0.1:5000/mitigate_weed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(treatmentPlan),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending treatment command:', error);
      return { success: false, message: 'Failed to send treatment command' };
    }
  };

export  const fetchTreatmentPlanById = async (planId) => {
    try {
      const response = await fetch(`/api/treatment-plans/${planId}`);
      if (!response.ok) throw new Error("Failed to fetch treatment plan");
      return await response.json();
    } catch (err) {
      console.error("Error fetching treatment plan:", err);
      throw err;
    }
  };