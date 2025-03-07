import React from 'react';

export const TreatmentStatus = ({ 
  treatmentStatus, 
  statusMessage, 
  treatmentProgress, 
  handleStartTreatment, 
  handleRetry, 
  isStartDisabled 
}) => {
  return (
    <div className="mb-6">
      {treatmentStatus === 'pending' && (
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={handleStartTreatment}
          disabled={isStartDisabled}
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
  );
};