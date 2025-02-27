import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import About from "./components/About";
import DummyFarmUI from "./components/DummyFarmUI";
import Mapping from "./components/Mapping";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dummy-farm-ui" element={<DummyFarmUI />} />  
        <Route path="/mapping" element={<Mapping />} />
      </Routes>
    </Router>
  );
}

export default App;
