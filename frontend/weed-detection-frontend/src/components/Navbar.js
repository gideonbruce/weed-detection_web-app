import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-blue-500 p-4 text-white flex justify-between">
      <h1 className="text-xl font-bold">Weed Control</h1>
      <div>
        <Link to="/" className="mx-2">Home</Link>
        <Link to="/about" className="mx-2">About</Link>
        <Link to="/farm" className="mx-2">Farm</Link>
      </div>
    </nav>
  );
};

export default Navbar;
