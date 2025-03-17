import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";

//import Navbar from "./components/Navbar";
import Home from "./components/Home";
import About from "./components/About";
import Mapping from "./components/Mapping";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { isAuthenticated } from "./utils/auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import WeedDetectionsTable from "./components/WeedDetectionsTable";
import TreatmentPlanning from "./components/TreatmentPlanning";
import Dashboard from "./components/Dashboard";
import Mitigation from "./components/Mitigation/WeedMitigation"

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/home" element={isAuthenticated() ? <Home /> : <Navigate to="/" />} />
        <Route path="/about" element={isAuthenticated() ? <About /> : <Navigate to="/" />} />
        <Route path="/farm" element={isAuthenticated() ? <Mapping /> : <Navigate to="/" />} />
        <Route path="/weeds-detected" element={isAuthenticated() ? <WeedDetectionsTable /> : <Navigate to="/" />} />
        <Route path="/treatment-planning" element={isAuthenticated() ? <TreatmentPlanning /> : <Navigate to="/" />} />
        <Route path="/dashboard" element={isAuthenticated() ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/mitigation" element={isAuthenticated() ? <Mitigation /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
