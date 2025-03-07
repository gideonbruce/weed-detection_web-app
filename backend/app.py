import smtplib
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
#from datetime import datetime

app = Flask(__name__)
CORS(app)

model = YOLO("C:\\Users\\Bruce\\Desktop\\weed detection project\\backend\\crop-weed-model.pt")  

app.config["SECRET_KEY"] = "dcdrdtrcsewdcx"

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

        #if not isinstance(data, dict): # checking if its a list
            #data = [data]
            
        connection = get_db_connection()
        cursor = connection.cursor()

        for detection in data:
            sql = """
            INSERT INTO weed_detections (id, latitude, longitude, timestamp, confidence, mitigation_status)
            VALUES (%s,%s,%s,%s,%s,%s)
            """
            values = (
                detection['id'],
                detection['latitude'],
                detection['longitude'],
                datetime.datetime.strptime(detection['timestamp'], "%Y-%m-%dT%H:%M:%S.%fZ"),
                detection['confidence'],
                "pending" #default mitigation status
            )
            cursor.execute(sql, values)

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({"message": f"Successfully stored {len(data)} detections!"}), 201

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/get_detections', methods=['GET'])
def get_detections():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT id, latitude, longitude, timestamp FROM weed_detections")
        detections = cursor.fetchall()

        cursor.close()
        connection.close()

        return jsonify(detections), 200
    
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

@app.route('/get_weed_trend', methods=['GET'])
def get_weed_trend():
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT date(timestamp) as date, COUNT(*) as weed_count FROM weed_detections GROUP BY date ORDER BY date ASC;")
        rows = cursor.fetchall()

        cursor.close()
        connection.close()

        trend_data = [{"date": row["date"], "weed_count": row["weed_count"]} for row in rows]
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
