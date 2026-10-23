
const camera = document.getElementById("camera");
const startButton = document.getElementById("startCamera");
const stopButton = document.getElementById("stopCamera");

const placeholder = document.getElementById("cameraPlaceholder");
const cameraBadge = document.getElementById("cameraBadge");
const cameraMessage = document.getElementById("cameraMessage");
const status = document.getElementById("status");
const statusDescription = document.getElementById("statusDescription");
const cameraOverlay = document.querySelector(".camera-overlay");
const modelStatus = document.getElementById("modelStatus");

// Camera variables
let cameraStream = null;
let detectionTimer = null;
let isDetecting = false;

// Alarm variables
let alarmAudioContext = null;
let alarmOscillator = null;
let alarmGain = null;
let alarmInterval = null;
let drowsinessStartTime = null;
let alarmActive = false;

// Alarm configuration
const DROWSINESS_THRESHOLD_MS = 3000;
const DETECTION_INTERVAL_MS = 1500;


// Start the alarm sound
function startAlarm() {
    if (alarmActive) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            cameraMessage.textContent =
                "Your browser does not support the alarm audio.";
            return;
        }

        alarmAudioContext = new AudioContextClass();

        alarmGain = alarmAudioContext.createGain();
        alarmGain.gain.value = 0.15;
        alarmGain.connect(alarmAudioContext.destination);

        alarmActive = true;

        function beep() {
            if (!alarmActive || !alarmAudioContext) return;

            alarmOscillator = alarmAudioContext.createOscillator();
            alarmOscillator.type = "square";
            alarmOscillator.frequency.value = 880;

            alarmOscillator.connect(alarmGain);
            alarmOscillator.start();

            alarmOscillator.stop(
                alarmAudioContext.currentTime + 0.25
            );

            alarmOscillator.onended = () => {
                alarmOscillator = null;
            };
        }

        beep();
        alarmInterval = setInterval(beep, 600);

    } catch (error) {
        console.error("Alarm audio error:", error);
    }
}


// Stop the alarm sound
function stopAlarm() {
    alarmActive = false;

    if (alarmInterval !== null) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }

    if (alarmOscillator) {
        try {
            alarmOscillator.stop();
        } catch (error) {
            // Oscillator may already have stopped.
        }

        alarmOscillator = null;
    }

    if (alarmAudioContext) {
        alarmAudioContext.close().catch(console.error);
        alarmAudioContext = null;
    }

    alarmGain = null;
}


// Process each model prediction
function processPrediction(result) {
    const predictions = result.predictions || [];

    if (predictions.length === 0) {
        cameraMessage.textContent = "No detection in this frame";
        status.textContent = "No Detection";
        statusDescription.textContent =
            "No prediction was returned for this frame.";

        // Do not assume the person is awake or drowsy.
        // Reset the timer to avoid alarming on uncertain data.
        drowsinessStartTime = null;
        stopAlarm();
        return;
    }

    // Choose the prediction with the highest confidence
    const prediction = predictions.reduce(
        (best, current) =>
            current.confidence > best.confidence ? current : best
    );

    const detectedClass = String(
        prediction.class || "unknown"
    ).toLowerCase();

    const confidence = (
        prediction.confidence * 100
    ).toFixed(1);

    cameraMessage.textContent =
        `Detected: ${detectedClass} (${confidence}%)`;

    const isDrowsy =
        detectedClass === "drowsy" ||
        detectedClass === "closed_eyes";

    if (detectedClass === "awake") {
        drowsinessStartTime = null;
        stopAlarm();

        status.textContent = "Awake";
        statusDescription.textContent =
            `Awake detected with ${confidence}% confidence.`;

    } else if (isDrowsy) {
        if (drowsinessStartTime === null) {
            drowsinessStartTime = Date.now();
        }

        const elapsed = Date.now() - drowsinessStartTime;
        const remaining = Math.max(
            0,
            DROWSINESS_THRESHOLD_MS - elapsed
        );

        status.textContent = alarmActive
            ? "Drowsiness Alarm Active"
            : "Drowsiness Warning";

        if (elapsed >= DROWSINESS_THRESHOLD_MS) {
            statusDescription.textContent =
                `${detectedClass} persists. Alarm activated.`;
            startAlarm();
        } else {
            statusDescription.textContent =
                `Drowsiness detected. Alarm check: ${(
                    remaining / 1000
                ).toFixed(1)} seconds remaining.`;
        }

    } else {
        // Unknown predictions should not trigger the alarm.
        drowsinessStartTime = null;
        stopAlarm();

        status.textContent = "Unknown State";
        statusDescription.textContent =
            "The model returned an unrecognized class.";
    }
}


// Capture a frame and request a prediction
async function detectFrame() {
    if (
        !cameraStream ||
        camera.readyState < 2 ||
        isDetecting
    ) {
        return;
    }

    isDetecting = true;

    try {
        const canvas = document.createElement("canvas");
        canvas.width = camera.videoWidth;
        canvas.height = camera.videoHeight;

        const context = canvas.getContext("2d");
        context.drawImage(
            camera,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const image = canvas.toDataURL("image/jpeg", 0.75);

        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ image })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Prediction request failed"
            );
        }

        console.log("Roboflow prediction:", result);

        modelStatus.textContent = "Connected";
        processPrediction(result);

    } catch (error) {
        console.error("Detection error:", error);

        modelStatus.textContent = "Detection Error";
        cameraMessage.textContent =
            "Unable to get a prediction. Check the Flask terminal.";

        status.textContent = "Detection Unavailable";
        statusDescription.textContent =
            "Prediction failed. Alarm state is being reset.";

        drowsinessStartTime = null;
        stopAlarm();

    } finally {
        isDetecting = false;
    }
}


// Start the camera
startButton.addEventListener("click", async () => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        camera.srcObject = cameraStream;
        await camera.play();

        camera.style.display = "block";
        placeholder.style.display = "none";

        if (cameraOverlay) {
            cameraOverlay.style.display = "block";
        }

        cameraBadge.textContent = "CAMERA ON";
        cameraMessage.textContent = "Starting AI detection...";
        status.textContent = "Camera Active";
        statusDescription.textContent =
            "Connecting to the Roboflow model...";
        modelStatus.textContent = "Connecting";

        startButton.disabled = true;
        stopButton.disabled = false;

        const indicator =
            document.querySelector(".mini-indicator");

        if (indicator) {
            indicator.style.background = "#50e6d2";
        }

        drowsinessStartTime = null;

        detectFrame();
        detectionTimer = setInterval(
            detectFrame,
            DETECTION_INTERVAL_MS
        );

    } catch (error) {
        console.error("Camera error:", error);

        cameraMessage.textContent =
            "Unable to access camera. Check browser permissions.";

        status.textContent = "Camera Unavailable";
        statusDescription.textContent =
            "Allow camera access and try again.";
    }
});


// Stop the camera and reset the alarm
stopButton.addEventListener("click", stopCamera);

function stopCamera() {
    if (detectionTimer !== null) {
        clearInterval(detectionTimer);
        detectionTimer = null;
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    stopAlarm();
    drowsinessStartTime = null;
    isDetecting = false;

    camera.srcObject = null;
    camera.style.display = "none";
    placeholder.style.display = "block";

    if (cameraOverlay) {
        cameraOverlay.style.display = "none";
    }

    cameraBadge.textContent = "OFFLINE";
    cameraMessage.textContent = "Camera access not started";
    status.textContent = "Awaiting Camera";
    statusDescription.textContent =
        "Start the camera to begin AI monitoring.";
    modelStatus.textContent = "Ready to connect";

    startButton.disabled = false;
    stopButton.disabled = true;

    const indicator =
        document.querySelector(".mini-indicator");

    if (indicator) {
        indicator.style.background = "#71829a";
    }
}


// Release resources when leaving the page
window.addEventListener("beforeunload", () => {
    if (detectionTimer !== null) {
        clearInterval(detectionTimer);
    }

    stopAlarm();

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
});
