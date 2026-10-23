
import os
import base64
import io

from PIL import Image
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# Roboflow configuration
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")
MODEL_ID = "driver-drowsiness-hivxp/1"

if not ROBOFLOW_API_KEY:
    raise ValueError(
        "ROBOFLOW_API_KEY is missing. Check your .env file."
    )

# Initialize Roboflow client
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=ROBOFLOW_API_KEY
)


# Home page
@app.route("/")
def home():
    return render_template("index.html")


# Check whether Flask is running
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "model": MODEL_ID,
        "message": "Flask backend is running"
    })


# Receive an image and get a Roboflow prediction
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        image_data = data.get("image", "")

        if not image_data:
            return jsonify({
                "error": "No image received"
            }), 400

        # Remove the data URL prefix
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]

        # Decode the image received from the browser
        image_bytes = base64.b64decode(
            image_data,
            validate=True
        )

        # Convert bytes into a PIL image
        image = Image.open(
            io.BytesIO(image_bytes)
        ).convert("RGB")

        # Send the image to Roboflow
        result = CLIENT.infer(
            image,
            model_id=MODEL_ID
        )

        # Return the prediction to the browser
        return jsonify(result)

    except Exception:
        app.logger.exception("Roboflow prediction failed")

        return jsonify({
            "error": "Prediction failed. Check the Flask terminal."
        }), 500


# Start the Flask server
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
