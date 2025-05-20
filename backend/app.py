import os
import smtplib
from flask import Flask, json, request, jsonify, send_file
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
from flask_cors import CORS
from pymongo import MongoClient
import bcrypt
import jwt
import datetime
#from datetime import datetime
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

model = YOLO(("C:\\Users\\Bruce\\Desktop\\weed detection project\\backend\\crop-weed-model.pt"))  

app.config["SECRET_KEY"] = "dcdrdtrcsewdcx"

# MongoDB connection
def get_db_connection():
    client = MongoClient(os.getenv("MONGODB_URI"))
    return client[os.getenv("MONGODB_DB_NAME")]

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    db = get_db_connection()
    user = db.users.find_one({'email': email})

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        token = jwt.encode(
            {'email': user['email'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        return jsonify({'token': token}), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()

    try:
        db = get_db_connection()
        # Check if user already exists
        if db.users.find_one({'email': email}):
            return jsonify({'message': 'Email already exists'}), 400
            
        db.users.insert_one({
            'email': email,
            'password_hash': hashed_password
        })
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500

@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"message": "Email not found"}), 400
    
    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

    connection.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    #generates reset token valid for 2 minutes
    token = jwt.encode(
        {"email": email, "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=2)},
        app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    return jsonify({"reset_link": reset_link}), 200
    #send email
    try:
        #server = smtplib.SMTP("smtp.gmail.com", 587)
        #server.starttls()
        #server.login("email@gmail.com", emailpassword)
        #message = f"Subject: Password reset\n\nClick here to reset your password: {reset_link}"
        #server.sendmail("email@gmail.com", email, message)
        #server.quit()*/
        #except:
        #return jsonify({"message": "Failed to send email"}), 500
        
        return jsonify({"message": "Password reset link sent"}), 200
    except Exception as e:
        print("Email sending failed:", str(e))
        return jsonify({"message": "Failed to send email", "error": str(e)}), 500

# api route to store json data in mysqldb
@app.route('/store_detections', methods=['POST'])
def store_detections():
    try:
        data = request.json
        print("Received data:", data)
            
        db = get_db_connection()
        detections = []

        for detection in data:
            detection_doc = {
                'id': detection['id'],
                'latitude': detection['latitude'],
                'longitude': detection['longitude'],
                'timestamp': datetime.datetime.strptime(detection['timestamp'], "%Y-%m-%dT%H:%M:%S.%fZ"),
                'confidence': detection['confidence'],
                'mitigation_status': 'pending'  # default mitigation status
            }
            detections.append(detection_doc)

        if detections:
            db.weed_detections.insert_many(detections)

        return jsonify({"message": f"Successfully stored {len(data)} detections!"}), 201

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/get_detections', methods=['GET'])
def get_detections():
    try:
        db = get_db_connection()
        detections = list(db.weed_detections.find(
            {},
            {'_id': 0, 'id': 1, 'latitude': 1, 'longitude': 1, 'timestamp': 1}
        ))
        return jsonify(detections), 200
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/get_weed_trend', methods=['GET'])
def get_weed_trend():
    try:
        db = get_db_connection()
        pipeline = [
            {
                '$group': {
                    '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}},
                    'weed_count': {'$sum': 1}
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'date': '$_id',
                    'weed_count': 1
                }
            },
            {
                '$sort': {'date': 1}
            }
        ]
        
        trend_data = list(db.weed_detections.aggregate(pipeline))
        return trend_data
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/weed_trend', methods=['GET'])
def weed_trend():
    try:
        data = get_weed_trend()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"Error": str(e)}), 500

@app.route('/reset-password', methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"message": "Token and new password are required"}), 400

    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        email = payload.get("email")

        hashed_password = generate_password_hash(new_password)

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE users SET password=%s WHERE email=%s", (hashed_password, email))
            connection.commit()
        connection.close()

        return jsonify({"message": "Password reset succesful"}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Reset link expired"}), 400
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 400

@app.route('/treatment-plans', methods=['POST'])
def create_treatment_plan():
    try:
        data = request.get_json()
        method = data.get('method')
        areas = data.get('areas')
        total_weeds = data.get('total_weeds')

        if not data or "method" not in data or "areas" not in data or "total_weeds" not in data:
            return jsonify({"error": "Missing required fields"}), 400
        
        method = data["method"]
        areas = data["areas"]  # MongoDB can store JSON directly
        total_weeds = int(data["total_weeds"])
        
        print("Received data:", data)

        db = get_db_connection()
        plan = {
            'method': method,
            'areas': areas,
            'total_weeds': total_weeds,
            'status': 'pending'
        }
        
        result = db.treatment_plans.insert_one(plan)
        return jsonify({"message": "Treatment plan added successfully", "id": str(result.inserted_id)}), 201
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/treatment-plans', methods=['GET'])
def get_treatment_plans():
    try:
        db = get_db_connection()
        plans = list(db.treatment_plans.find({}, {'_id': 0}))
        return jsonify(plans), 200

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/mitigate_weed', methods=['POST'])
def mitigate_weed():
    try:
        data = request.json
        detection_id = data.get('detection_id')
        method = data.get('method')
        applied_by = data.get('applied_by')
        notes = data.get('notes', '')

        if not detection_id or not method or not applied_by:
            return jsonify({"error": "Missing required fields"}), 400
        
        db = get_db_connection()
        
        # Create mitigation record
        mitigation = {
            'detection_id': detection_id,
            'method': method,
            'applied_by': applied_by,
            'notes': notes,
            'timestamp': datetime.datetime.utcnow()
        }
        
        db.weed_mitigations.insert_one(mitigation)

        # Update weed detection status
        db.weed_detections.update_one(
            {'id': detection_id},
            {
                '$set': {
                    'mitigation_status': 'completed',
                    'mitigation_timestamp': datetime.datetime.utcnow()
                }
            }
        )

        return jsonify({"message": "Mitigation recorded successfully"}), 201

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/get_mitigation_history', methods=['GET'])
def get_mitigation_history():
    try:
        db = get_db_connection()
        
        pipeline = [
            {
                '$lookup': {
                    'from': 'weed_mitigations',
                    'localField': 'id',
                    'foreignField': 'detection_id',
                    'as': 'mitigation'
                }
            },
            {
                '$unwind': '$mitigation'
            },
            {
                '$project': {
                    '_id': 0,
                    'id': 1,
                    'latitude': 1,
                    'longitude': 1,
                    'timestamp': 1,
                    'mitigation_status': 1,
                    'method': '$mitigation.method',
                    'applied_by': '$mitigation.applied_by',
                    'mitigation_time': '$mitigation.timestamp',
                    'notes': '$mitigation.notes'
                }
            },
            {
                '$match': {
                    'mitigation_status': 'completed'
                }
            },
            {
                '$sort': {
                    'mitigation_time': -1
                }
            }
        ]
        
        history = list(db.weed_detections.aggregate(pipeline))
        return jsonify(history), 200

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/treatment-plans/<plan_id>/status', methods=['PUT'])
def update_treatment_status(plan_id):
    try:
        data = request.get_json()
        new_status = data.get('status')

        valid_statuses = ['pending', 'in-progress', 'completed', 'error']
        if not new_status or new_status not in valid_statuses:
            return jsonify({
                "error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            }), 400

        db = get_db_connection()
        
        # Check if plan exists
        plan = db.treatment_plans.find_one({'_id': plan_id})
        if not plan:
            return jsonify({"error": f"Treatment plan with ID {plan_id} not found"}), 404
        
        # Update status
        db.treatment_plans.update_one(
            {'_id': plan_id},
            {'$set': {'status': new_status}}
        )

        return jsonify({"message": "Treatment status updated successfully"}), 200
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/detect', methods=['POST'])
def detect():
    print("Recieved request:", request.files)

    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files['image']
    image = Image.open(io.BytesIO(file.read())) 
    image_cv = np.array(image) 
    image_cv = cv2.cvtColor(image_cv, cv2.COLOR_RGB2BGR)

    results = model(image, imgsz=640) 

    detections = []
    for result in results:
        for box in result.boxes:
            cls = int(box.cls[0]) 
            conf = float(box.conf[0])  
            x1, y1, x2, y2 = map(int, box.xyxy[0]) 

            if conf < 0.3:
                continue

            label = "crop" if cls == 0 else "weed"

            detections.append(
                {"class": label, "confidence": conf, "bbox": [x1, y1, x2, y2]}
                )
            
            # drawing bounding boxes
            color = (0, 255, 0) if label == "crop" else (0, 0, 255)
            cv2.rectangle(image_cv, (x1, y1), (x2, y2), color, 2)
            cv2.putText(image_cv, f"{label} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
    #save processed image
    output_path = "output.jpg"
    cv2.imwrite(output_path, image_cv)

    return send_file(output_path, mimetype='image/jpeg')

if __name__ == '__main__':
    app.run(debug=True)
