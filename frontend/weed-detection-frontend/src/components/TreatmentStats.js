import React from 'react';

const TreatmentStats = ({ stats }) => {
  return (
    <div>
      <h3 className="text-md font-semibold text-gray-800 mt-6">Treatment Statistics</h3>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="p-3 bg-gray-50 rounded shadow">
          <span className="text-xs text-gray-500">Total Weeds:</span>
          <p className="font-semibold text-gray-800">{stats.totalWeeds}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded shadow">
          <span className="text-xs text-gray-500">High Density Areas:</span>
          <p className="font-semibold text-gray-800">{stats.highDensityAreas}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded shadow">
          <span className="text-xs text-gray-500">Est. Chemical Usage:</span>
          <p className="font-semibold text-gray-800">{stats.estimatedChemicalUsage} L</p>
        </div>
        <div className="p-3 bg-gray-50 rounded shadow">
          <span className="text-xs text-gray-500">Est. Time Required:</span>
          <p className="font-semibold text-gray-800">{stats.estimatedTimeRequired} min</p>
        </div>
        <div className="p-3 bg-gray-50 rounded shadow">
          <span className="text-xs text-gray-500">Est. Cost:</span>
          <p className="font-semibold text-gray-800">{stats.costEstimate} Ksh</p>
        </div>
      </div>
    </div>
  );
};

export default TreatmentStats;