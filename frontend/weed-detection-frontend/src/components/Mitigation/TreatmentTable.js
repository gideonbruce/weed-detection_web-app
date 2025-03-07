import React from 'react';

export const TreatmentTable = ({ areas, calculatePolygonPoints }) => {
  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold text-gray-800 mb-2">Treatment Areas</h3>
      <div className="border rounded overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {areas.map((area, index) => {
              // Calculate approximate area size
              let size = "Unknown";
              if (area.size) {
                size = typeof area.size === 'number' ? `${area.size.toFixed(2)} sq m` : area.size;
              } else if (area.bounds) {
                const width = Math.abs(area.bounds.northEast[1] - area.bounds.southWest[1]);
                const height = Math.abs(area.bounds.northEast[0] - area.bounds.southWest[0]);
                // Very rough approximation
                size = `~${(width * height * 111319).toFixed(2)} sq m`;
              }
              
              return (
                <tr key={`area-row-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      area.type === 'broadcast' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {area.type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{size}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};