from flask import Flask, request, jsonify
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

# Load the YOLO model
model = YOLO("C:\\Users\\Bruce\\Desktop\\weed detection project\\backend\\crop-weed-model.pt")  

@app.route('/detect', methods=['POST'])
def detect():
    print("Recieved request:", request.files)

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    image = Image.open(io.BytesIO(file.read()))  # Read image
    image_cv = np.array(image)  # converting to opencv format
    image_cv = cv2.cvtColor(image_cv, cv2.COLOR_RGB2BGR)

    results = model(image, imgsz=640)  # Run YOLO inference

    detections = []
    for result in results:
        for box in result.boxes:
            cls = int(box.cls[0])  # Class index
            conf = float(box.conf[0])  # Confidence score
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # Bounding box

            #filtering low confidences
            if conf < 0.5:
                continue

            label = "maize" if cls == 0 else "weed"

            detections.append(
                {"class": label, "confidence": conf, "bbox": [x1, y1, x2, y2]}
                )
            
            # drawing bounding boxes
            color = (0, 255, 0) if label == "maize" else (0, 0, 255)
            cv2.rectangle(image_cv, (x1, y1), (x2, y2), color, 2)
            cv2.putText(image_cv, f"{label} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            

    return jsonify({"detections": detections})

if __name__ == '__main__':
    app.run(debug=True)
