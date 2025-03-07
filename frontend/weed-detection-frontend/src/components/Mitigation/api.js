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