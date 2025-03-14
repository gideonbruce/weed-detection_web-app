import React from 'react';

const TreatmentOptions = ({ selectedTreatment, onSelectTreatment }) => {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Treatment Options</h2>
      
      <div className="space-y-4">
        {/* Precision Treatment */}
        <div 
          className={`p-4 border rounded-lg cursor-pointer transition ${
            selectedTreatment === 'precision' ? 'bg-green-100 border-green-500' : 'bg-gray-50'
          }`}
          onClick={() => onSelectTreatment('precision')}
        >
          <h3 className="text-md font-semibold text-gray-700">Precision Treatment</h3>
          <p className="text-sm text-gray-600">Target individual weeds with minimal herbicide.</p>
          <ul className="list-disc ml-5 text-sm text-gray-500">
            <li>Lowest environmental impact</li>
            <li>Most time-consuming</li>
            <li>Highest precision</li>
          </ul>
        </div>

        {/* Zone Treatment */}
        <div 
          className={`p-4 border rounded-lg cursor-pointer transition ${
            selectedTreatment === 'zone' ? 'bg-yellow-100 border-yellow-500' : 'bg-gray-50'
          }`}
          onClick={() => onSelectTreatment('zone')}
        >
          <h3 className="text-md font-semibold text-gray-700">Zone Treatment</h3>
          <p className="text-sm text-gray-600">Treat clusters of weeds in defined zones.</p>
          <ul className="list-disc ml-5 text-sm text-gray-500">
            <li>Balanced approach</li>
            <li>Good efficiency</li>
            <li>Moderate herbicide use</li>
          </ul>
        </div>

        {/* Broadcast Treatment */}
        <div 
          className={`p-4 border rounded-lg cursor-pointer transition ${
            selectedTreatment === 'broadcast' ? 'bg-red-100 border-red-500' : 'bg-gray-50'
          }`}
          onClick={() => onSelectTreatment('broadcast')}
        >
          <h3 className="text-md font-semibold text-gray-700">Broadcast Treatment</h3>
          <p className="text-sm text-gray-600">Apply herbicide across the entire infested area.</p>
          <ul className="list-disc ml-5 text-sm text-gray-500">
            <li>Fastest application</li>
            <li>Highest herbicide usage</li>
            <li>Best for severe infestations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TreatmentOptions;