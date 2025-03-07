// App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const App = () => {
  // State variables
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [isModelReady, setIsModelReady] = useState(false);
  const [model, setModel] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [savedImages, setSavedImages] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(true);
  
  const cameraRef = useRef(null);

  // Request camera and media library permissions
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      
      setHasPermission(
        cameraStatus === 'granted' && mediaLibraryStatus === 'granted'
      );
      
      // Create app directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'weed_images/');
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'weed_images/');
      }
      
      // Load saved images
      await loadSavedImages();
      
      // Load TensorFlow and model
      await setupModel();
    })();
  }, []);

  // Load model
  const setupModel = async () => {
    try {
      // Initialize TensorFlow.js
      await tf.ready();
      console.log('TensorFlow ready');
      
      // Load model - you would need to include model files in your assets
      // This is a placeholder for the actual model loading code
      // The actual model files (model.json and weight files) should be included in your project
      
       const modelJson = require('./assets/model/model.json');
       const modelWeights = [
         require('./assets/model/group1-shard1of2.bin'),
         require('./assets/model/group1-shard2of2.bin')
       ];
       const model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
      
      // For this example, we'll simulate a loaded model
      console.log('Model loaded');
      setIsModelReady(true);
      
      // Placeholder for actual model
      setModel({
        predict: async (tensor) => {
          // Simulated prediction - in a real app, this would use the actual model
          // Randomly classifies as weed 30% of the time for demonstration
          const randomPrediction = Math.random() > 0.7;
          return { isWeed: randomPrediction, confidence: Math.random() * 0.5 + 0.5 };
        }
      });
      
    } catch (error) {
      console.error('Failed to load model:', error);
      Alert.alert('Model Error', 'Failed to load the weed detection model.');
    }
  };

  // Load previously saved images
  const loadSavedImages = async () => {
    try {
      const files = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory + 'weed_images/'
      );
      
      const images = files.map(filename => ({
        uri: FileSystem.documentDirectory + 'weed_images/' + filename,
        filename
      })).sort((a, b) => {
        // Sort by timestamp in filename (assuming format timestamp.jpg)
        const timeA = a.filename.split('.')[0];
        const timeB = b.filename.split('.')[0];
        return timeB - timeA;
      });
      
      setSavedImages(images);
    } catch (error) {
      console.error('Failed to load saved images:', error);
    }
  };

  // Handle taking a picture
  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      setCapturedImage(photo.uri);
      setIsCameraActive(false);
      
      // Process image with model
      await processImage(photo.uri);
      
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Camera Error', 'Failed to take picture.');
      setIsProcessing(false);
    }
  };

  // Process the captured image with the model
  const processImage = async (imageUri) => {
    try {
      // Resize image to match model input requirements
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 224, height: 224 } }],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Read the image data
      const imgB64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert to tensor
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const raw = new Uint8Array(imgBuffer);
      const tensor = decodeJpeg(raw).expandDims(0);
      
      // Normalize the tensor (if required by your model)
      const normalized = tensor.div(255.0);
      
      // Get prediction
      const prediction = await model.predict(normalized);
      
      // In a real app, you would interpret the model output based on your model architecture
      // For this example, we use the simulated prediction
      
      setDetectionResult(prediction);
      
      // Save image if weed is detected
      if (prediction.isWeed) {
        await saveImage(imageUri);
      }
      
    } catch (error) {
      console.error('Failed to process image:', error);
      Alert.alert('Processing Error', 'Failed to analyze the image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save the image if a weed is detected
  const saveImage = async (imageUri) => {
    try {
      const timestamp = Date.now();
      const newPath = FileSystem.documentDirectory + 'weed_images/' + timestamp + '.jpg';
      
      await FileSystem.copyAsync({
        from: imageUri,
        to: newPath
      });
      
      // Add to saved images list
      setSavedImages(prevImages => [
        { uri: newPath, filename: timestamp + '.jpg' },
        ...prevImages
      ]);
      
      console.log('Image saved:', newPath);
    } catch (error) {
      console.error('Failed to save image:', error);
      Alert.alert('Save Error', 'Failed to save the weed image.');
    }
  };

  // Reset camera view
  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectionResult(null);
    setIsCameraActive(true);
  };

  // Render the camera
  const renderCamera = () => {
    if (hasPermission === null) {
      return <View style={styles.container}><ActivityIndicator size="large" /></View>;
    }
    
    if (hasPermission === false) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>No access to camera or media library</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={cameraType}
          ratio="16:9"
        />
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setCameraType(
              cameraType === Camera.Constants.Type.back
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
            )}
          >
            <Text style={styles.flipText}>Flip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.captureButton, !isModelReady && styles.buttonDisabled]}
            onPress={takePicture}
            disabled={!isModelReady}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => setIsCameraActive(false)}
          >
            <Text style={styles.galleryText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {!isModelReady && (
          <View style={styles.modelLoadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.modelLoadingText}>Loading weed detection model...</Text>
          </View>
        )}
      </View>
    );
  };

  // Render the preview after taking a photo
  const renderPreview = () => {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        
        <View style={styles.previewControls}>
          <TouchableOpacity style={styles.previewButton} onPress={retakePhoto}>
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>
          
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.processingText}>Analyzing...</Text>
            </View>
          ) : (
            detectionResult && (
              <View style={styles.resultContainer}>
                <Text style={[
                  styles.resultText,
                  detectionResult.isWeed ? styles.weedDetectedText : styles.noWeedText
                ]}>
                  {detectionResult.isWeed 
                    ? `Weed Detected! (${(detectionResult.confidence * 100).toFixed(1)}%)` 
                    : 'No Weed Detected'}
                </Text>
              </View>
            )
          )}
          
          <TouchableOpacity 
            style={styles.previewButton} 
            onPress={() => setIsCameraActive(true)}
          >
            <Text style={styles.previewButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render the gallery of saved weed images
  const renderGallery = () => {
    return (
      <View style={styles.galleryContainer}>
        <View style={styles.galleryHeader}>
          <Text style={styles.galleryTitle}>Weed Images</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              if (capturedImage) {
                retakePhoto();
              } else {
                setIsCameraActive(true);
              }
            }}
          >
            <Text style={styles.backButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>
        
        {savedImages.length === 0 ? (
          <View style={styles.emptyGallery}>
            <Text style={styles.emptyGalleryText}>
              No weed images saved yet. Detected weeds will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={savedImages}
            keyExtractor={(item) => item.filename}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={styles.imageItem}>
                <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
                <Text style={styles.imageDate}>
                  {new Date(parseInt(item.filename)).toLocaleDateString()}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  // Main render function
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {isCameraActive ? (
        renderCamera()
      ) : (
        capturedImage ? renderPreview() : renderGallery()
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  flipButton: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
  },
  flipText: {
    color: '#fff',
    fontSize: 16,
  },
  galleryButton: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
  },
  galleryText: {
    color: '#fff',
    fontSize: 16,
  },
  modelLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modelLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  previewButton: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  processingContainer: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  resultContainer: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weedDetectedText: {
    color: '#ff5252',
  },
  noWeedText: {
    color: '#4caf50',
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  galleryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyGallery: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyGalleryText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  imageItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#222',
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  imageDate: {
    color: '#fff',
    padding: 8,
    fontSize: 12,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
});

export default App;