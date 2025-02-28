from flask import Flask, request, jsonify, send_file
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
from flask_cors import CORS
import pymysql
import bcrypt
import jwt
import datetime

app = Flask(__name__)
CORS(app)

model = YOLO("C:\\Users\\Bruce\\Desktop\\weed detection project\\backend\\crop-weed-model.pt")  

app.config["SECRET_KEY"] = "dcdrdtrcsewsdcx"

#Database conn
def get_db_connection():
    return pymysql.connect(
        host='localhost',
        user='root',
        password='@Gideon',
        database='react',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    connection = get_db_connection()
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

    connection.close()

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
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s)", (email, hashed_password))
            connection.commit()
        connection.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except pymysql.err.IntegrityError:
        return jsonify({'message': 'Email already exists'}), 400

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
        algorithm="hs256",
    )

    reset_link = f"http://localhost:3000/reset-password?token={token}"

    #send email
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login("email@gmail.com", emailpassword)
        message = f"Subject: Password reset\n\nClick here to reset your password: {reset_link}"
        server.sendmail("email@gmail.com", email, message)
        server.quit()
    except:
        return jsonify({"message": "Failed to send email"}), 500
        
    return jsonify({"message": "Password reset link sent"}), 200

# api route to store json data in mysqldb
@app.route('/store_detections', methods=['POST'])
def store_detections():
    try:

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
