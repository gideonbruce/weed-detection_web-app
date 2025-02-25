from flask import Flask, request, jsonify
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# Load the YOLO model
model = YOLO("backend/crop-weed.pt")  

@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    image = Image.open(io.BytesIO(file.read()))  # Read image
    results = model(image, imgsz=640)  # Run YOLO inference

    detections = []
    for result in results:
        for box in result.boxes:
            cls = int(box.cls[0])  # Class index
            conf = float(box.conf[0])  # Confidence score
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box

            detections.append({
                "class": "maize" if cls == 0 else "weed",
                "confidence": conf,
                "bbox": [x1, y1, x2, y2]
            })

    return jsonify({"detections": detections})

if __name__ == '__main__':
    app.run(debug=True)
