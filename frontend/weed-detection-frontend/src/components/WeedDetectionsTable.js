import { useState, useEffect } from 'react';

const WeedDetectionsTable = () => {
    const [weeds, setWeeds] = useState([]);
    const [showTable, setShowTable] = useState(false);

    useEffect(() => {
        fetch('http://127.0.0.1:5000/get_detections')
            .then(response => response.json())
            .then(data => setWeeds(data))
            .catch(error => console.error('Error fetching data:', error));
    }, []);

    return (
        <div className="p-4">
            <button 
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                onClick={() => setShowTable(!showTable)}
            >
                {showTable ? 'Hide Weeds' : 'New Weeds'}
            </button>
            
            {showTable && (
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="px-4 py-2 border">#</th>
                                <th className="px-4 py-2 border">Latitude</th>
                                <th className="px-4 py-2 border">Longitude</th>
                                <th className="px-4 py-2 border">Confidence</th>
                                <th className="px-4 py-2 border">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weeds.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">No new weeds</td>
                                </tr>
                            ) : (
                                weeds.map((weed, index) => (
                                    <tr key={index} className="hover:bg-gray-100">
                                        <td className="px-4 py-2 border text-center">{index + 1}</td>
                                        <td className="px-4 py-2 border">{weed.latitude}</td>
                                        <td className="px-4 py-2 border">{weed.longitude}</td>
                                        <td className="px-4 py-2 border text-center">{weed.confidence}%</td>
                                        <td className="px-4 py-2 border">{new Date(weed.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WeedDetectionsTable;
