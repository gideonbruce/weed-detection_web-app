import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
//import Navbar from "./components/Navbar";
import Home from "./components/Home";
import About from "./components/About";
import DummyFarmUI from "./components/DummyFarmUI";
import Mapping from "./components/Mapping";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { isAuthenticated } from "./utils/auth";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={isAuthenticated() ? <Home /> : <Navigate to="/login" />} />
        <Route path="/about" element={<About />} />
        <Route path="/dummy-farm-ui" element={<DummyFarmUI />} />  
        <Route path="/farm" element={<Mapping />} />
      </Routes>
    </Router>
  );
}

export default App;
