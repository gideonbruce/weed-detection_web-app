import React from 'react';

export const ErrorState = ({ error }) => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Weed Mitigation</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-700 font-medium">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
};