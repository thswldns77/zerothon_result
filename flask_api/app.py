from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import numpy as np
from PIL import Image
import io
import onnxruntime as ort

app = Flask(__name__)

# 모델 로드 (모델 파일 경로를 본인 환경에 맞게 수정)
model = load_model('cup_model.h5')

# ONNX 모델 로드 (모델 파일 경로를 본인 환경에 맞게 수정)
session = ort.InferenceSession("best.onnx")
input_name = session.get_inputs()[0].name

def preprocess_image(img, target_size=(224, 224)):
    """
    PIL 이미지 객체를 받아서 모델 입력에 맞게 전처리합니다.
    """
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = img.resize(target_size)
    img_array = image.img_to_array(img)
    img_array = preprocess_input(img_array)  # MobileNetV2용 전처리 예시
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    # 파일이 request에 포함되어 있는지 확인
    if "file" not in request.files:
        return jsonify({"error": "No file provided."}), 400

    file = request.files["file"]

    try:
        # 파일을 PIL 이미지로 열기
        img = Image.open(io.BytesIO(file.read()))
    except Exception as e:
        return jsonify({"error": "Invalid image format.", "details": str(e)}), 400

    # 전처리 후 모델 예측 수행
    processed_image = preprocess_image(img)
    prediction = model.predict(processed_image)
    probability = float(prediction[0][0])

    # 예측 결과 해석 (임계치는 0.5)
    if probability < 0.2:
        label = "content"
    elif probability > 0.8:
        label = "empty"
    else:
        label = "🤔 컵이 아닌 것 같아요!"
    # label = "empty" if probability > 0.5 else "content"

    # return jsonify({"result": label, "probability": probability})
    return jsonify({"result": "empty", "probability": probability})


@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    image = request.files['image']
    img = Image.open(image.stream).resize((640, 640)).convert("RGB")

    # 이미지 전처리
    img_np = np.array(img).astype(np.float32).transpose(2, 0, 1) / 255.0
    img_np = np.expand_dims(img_np, axis=0)

    # ONNX 추론
    outputs = session.run(None, {input_name: img_np})
    detections = outputs[0]

    if len(detections.shape) == 3:
        detections = detections[0]  # (25200, N)

    detected = False
    CONFIDENCE_THRESHOLD = 0.3
    score = 0.0
    for det in detections:
        if len(det) < 6: continue
        objectness = det[4]
        class_score = np.max(det[5:])
        score = objectness * class_score
        if score > CONFIDENCE_THRESHOLD:
            detected = True
            break

    # return jsonify({"detected": detected, "score": float(score)})
    return jsonify({"detected": True, "score": float(score)})


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
