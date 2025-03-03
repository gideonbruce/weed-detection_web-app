import React, { useEffect, useState } from "react";
import { Line, LineChart, XAxis, YAxis, Pie, Tooltip, Legend, Bar, ResponsiveContainer, BarChart, PieChart } from "recharts";

const WeedTrendDashboard = () => {
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTrendData = async () => {
            try {
                const response = await fetch("http://127.0.0.1:5000/weed_trend");
                if (!response.ok) {
                    throw new Error("Failed to fetch data");
                }
                const data = await response.json();
                setTrendData(data);
            } catch (err) {
                console.error("Error fetching weed trend data", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTrendData();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>

    return (
        <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Weed Growth Trend</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/**line chart */}
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="weedCount" stroke="#ff0000" name="Weeds" />
                    </LineChart>
                </ResponsiveContainer>

                {/**Bar chart */}
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="weedCount" fill="#ff0000" name="Weeds" />
                        <Bar dataKey="cropCount" fill="#00ff00" name="crop" />
                    </BarChart>
                </ResponsiveContainer>

                {/** pie chart */}
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={trendData} dataKey="weedCount" nameKey="zone" fill="#ff0000" label />
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default WeedTrendDashboard;