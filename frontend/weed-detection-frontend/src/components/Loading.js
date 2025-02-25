const Loading = () => (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-green-600 border-solid"></div>
      <p className="mt-4 text-gray-700">Processing image, please wait...</p>
    </div>
  );
  
  export default Loading;
  