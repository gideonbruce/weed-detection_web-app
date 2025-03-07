import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Sidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate(); // Hook for navigation

  const handleLogout = () => {
    // Perform logout logic (e.g., clear user session)
    navigate("/"); // Redirect to login page
  };

  return (
    <div>
      <button className="md:hidden fixed top-4 left-4 z-50 bg-green-600 text-white p-2 rounded-lg" onClick={() => setSidebarOpen(true)}>
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform md:translate-x-0 md:relative`}>
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold text-green-700">Menu</h2>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button> 
        </div>
        <nav className="mt-4">
          <a href="/farm" className="block py-2 px-5 text-gray-700 hover:bg-green-200">Farm</a>
          <a href="treatment-planning" className="block py-2 px-5 text-gray-700 hover:bg-green-200">Treatment Planning</a>
          <a href="/weeds-detected" className="block py-2 px-5 text-gray-700 hover:bg-green-200">Statistics</a>
          <a href="/mitigation" className="block py-2 px-5 text-gray-700 hover:bg-green-200">Mitigation</a>
          <a href="/dashboard" className="block py-2 px-5 text-gray-700 hover:bg-green-200">Data Analysis</a>
        </nav>
        <button onClick={handleLogout} className="w-full py-2 px-4 text-white bg-red-500 hover:bg-red-700 mt-2 rounded-lg">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
