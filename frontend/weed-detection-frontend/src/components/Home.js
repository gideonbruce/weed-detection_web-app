import { useState } from "react";
import Loading from "./Loading";

const Home = () => {
  
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image) {
      alert("Please select an image first.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("http://127.0.0.1:5000/detect", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setProcessedImage(URL.createObjectURL(blob));
      } else {
        alert("Error processing image.");
      }
    } catch (error) {
      alert("Failed to connect to the server.");
      (error && <p className="text-red-500 mt-2">{error}</p>)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-lg w-full">
        <h2 className="text-3xl font-bold mb-6 text-center text-green-700">Weed Detection System</h2>

        <label className="block w-full cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg text-center mb-4 transition">
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          Select an Image
        </label>

        {preview && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Image Preview:</h3>
            <img src={preview} alt="Preview" className="w-full h-auto rounded-lg shadow-md" />
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full py-3 px-4 text-white rounded-lg transition ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? <Loading /> : "Upload & Detect"}
        </button>

        {processedImage && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">Processed Image:</h3>
            <img src={processedImage} alt="Processed" className="w-full h-auto border-4 border-green-500 rounded-lg shadow-md" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
