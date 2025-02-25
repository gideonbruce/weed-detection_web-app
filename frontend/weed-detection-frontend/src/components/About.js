const About = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-6">
      <div className="max-w-3xl bg-white shadow-lg rounded-2xl p-8">
        <h2 className="text-3xl font-extrabold text-green-700 mb-4">
          About the Weed Detection System
        </h2>
        <p className="text-gray-700 text-lg">
          This AI-powered system uses YOLOv8 to detect crops and weeds 
          from aerial images. By distinguishing between crops and unwanted plants, 
          it helps farmers optimize weed control and improve crop yield efficiently.
        </p>
        <p className="text-gray-600 mt-4">
          The system is trained on 1,400 aerial images and leverages deep learning 
          for precise detection, making modern agriculture smarter and more sustainable.
        </p>
      </div>
    </div>
  );
  
  export default About;
  