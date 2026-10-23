# VigilAI – AI-Based Drowsiness Detection System

VigilAI is a web-based AI application that detects possible drowsiness using a live camera and a trained Roboflow model. An audible alarm activates when drowsiness persists for a configured duration.

## Features

- Live camera monitoring
- AI-based drowsiness detection
- Classification of `awake`, `drowsy`, and `closed_eyes`
- Automatic audible alarm
- Prediction confidence display
- Flask-based web application

## Tech Stack

- Python
- Flask
- Roboflow Inference SDK
- HTML, CSS, JavaScript
- Pillow
- python-dotenv

## Project Structure

```text
Drowsiness-Detection-System/
├── app.py
├── requirements.txt
├── .gitignore
├── templates/
│   └── index.html
└── static/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── camera.js
    └── audio/
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arunprakash-3001/VigilAI-Drowsiness-Detection.git
cd VigilAI-Drowsiness-Detection
```

### 2. Create a virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure the API key

Create a `.env` file in the project root:

```text
ROBOFLOW_API_KEY=your_roboflow_api_key
```

Replace the placeholder with your own Roboflow API key. Never upload your real `.env` file or API key to GitHub.

### 5. Run the application

```bash
python app.py
```

Open `http://127.0.0.1:5000` in your browser and allow camera access.

## How It Works

1. The camera captures frames.
2. Frames are sent to the Flask backend.
3. The backend sends images to the Roboflow model.
4. Predictions are returned to the browser.
5. The alarm activates when drowsiness persists for the configured threshold.

## Disclaimer

This is an educational prototype. AI predictions can be inaccurate, and the system is not a certified driver-safety device. Never rely on it as a substitute for adequate rest or safe driving practices.


<img width="1882" height="1031" alt="image" src="https://github.com/user-attachments/assets/6c231f7c-171e-426a-9f4e-a58aa2e29e2e" />


