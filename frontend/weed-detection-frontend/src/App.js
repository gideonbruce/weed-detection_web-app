import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

//import Navbar from "./components/Navbar";
import Home from "./components/Home";
import About from "./components/About";
import DummyFarmUI from "./components/DummyFarmUI";
import Mapping from "./components/Mapping";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { isAuthenticated } from "./utils/auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WeedDetectionsTable from "./components/WeedDetectionsTable";
import TreatmentPlanning from "./components/TreatmentPlanning";
import Dashboard from "./components/Dashboard";
import Mitigation from "./components/Mitigation"

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={isAuthenticated() ? <Home /> : <Navigate to="/" />} />
        <Route path="/about" element={<About />} />
        <Route path="/dummy-farm-ui" element={<DummyFarmUI />} />  
        <Route path="/farm" element={<Mapping />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/weeds-detected" element={<WeedDetectionsTable />} />
        <Route path="/treatment-planning" element={<TreatmentPlanning />} /> 
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mitigation" element={<Mitigation />} />
      </Routes>
    </Router>
  );
}

export default App;
