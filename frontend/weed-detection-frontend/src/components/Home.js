import { useState } from "react";

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Upload an Image</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} className="mb-4" />

      {preview && <img src={preview} alt="Preview" className="w-80 h-auto mb-4" />}

      <button onClick={handleUpload} disabled={loading} className="px-6 py-2 bg-blue-500 text-white rounded-lg">
        {loading ? "Processing..." : "Upload & Detect"}
      </button>

      {processedImage && (
        <div className="mt-6">
          <h3>Processed Image:</h3>
          <img src={processedImage} alt="Processed" className="w-80 h-auto border-2 border-green-500" />
        </div>
      )}
    </div>
  );
};

export default Home;
