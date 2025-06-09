// File: script.js
let video = document.getElementById("video");
let canvas = document.createElement("canvas");
let context = canvas.getContext("2d");
canvas.width = 640;
canvas.height = 480;

let motionCanvas = document.getElementById("motionCanvas");
let motionCtx = motionCanvas.getContext("2d");
let alarmSound = document.getElementById("alarmSound");
let statusText = document.getElementById("status");
let logContainer = document.getElementById("log");

let previousFrame = null;
let monitoring = false;
let drawZone = false;
let zone = null;
let alarmEnabled = true;
let loggingEnabled = true;
let logs = [];

// Admin Panel Controls
document.getElementById("toggleAlarm").onchange = (e) => alarmEnabled = e.target.checked;
document.getElementById("toggleLogs").onchange = (e) => loggingEnabled = e.target.checked;

function startMonitoring() {
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    monitoring = true;
    statusText.textContent = "Status: Monitoring...";
    requestAnimationFrame(processFrame);
  });
}

function stopMonitoring() {
  monitoring = false;
  if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
  alarmSound.pause();
  alarmSound.currentTime = 0;
  statusText.textContent = "Status: Idle";
}

function toggleZoneDraw() {
  drawZone = !drawZone;
  if (drawZone) {
    statusText.textContent = "Status: Draw detection zone on canvas";
    motionCanvas.addEventListener("mousedown", startZone);
  } else {
    motionCanvas.removeEventListener("mousedown", startZone);
  }
}

function startZone(e) {
  const startX = e.offsetX;
  const startY = e.offsetY;
  function drawRect(ev) {
    const width = ev.offsetX - startX;
    const height = ev.offsetY - startY;
    motionCtx.clearRect(0, 0, canvas.width, canvas.height);
    motionCtx.strokeStyle = "red";
    motionCtx.strokeRect(startX, startY, width, height);
  }
  function finishZone(ev) {
    const width = ev.offsetX - startX;
    const height = ev.offsetY - startY;
    zone = { x: startX, y: startY, width, height };
    motionCanvas.removeEventListener("mousemove", drawRect);
    motionCanvas.removeEventListener("mouseup", finishZone);
    statusText.textContent = "Status: Zone set. Monitoring resumed.";
  }
  motionCanvas.addEventListener("mousemove", drawRect);
  motionCanvas.addEventListener("mouseup", finishZone);
}

function processFrame() {
  if (!monitoring) return;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const current = context.getImageData(0, 0, canvas.width, canvas.height);

  if (previousFrame) {
    let diff = 0;
    for (let i = 0; i < current.data.length; i += 4) {
      diff += Math.abs(current.data[i] - previousFrame.data[i]);
      diff += Math.abs(current.data[i + 1] - previousFrame.data[i + 1]);
      diff += Math.abs(current.data[i + 2] - previousFrame.data[i + 2]);
    }

    const avgDiff = diff / (canvas.width * canvas.height);
    if (avgDiff > 20) {
      if (alarmEnabled && alarmSound.paused) alarmSound.play();
      if (loggingEnabled) saveLog();
      statusText.textContent = "Status: Motion Detected! Alarm ON!";
    } else {
      alarmSound.pause();
      alarmSound.currentTime = 0;
      statusText.textContent = "Status: No motion.";
    }
  }
  previousFrame = current;
  requestAnimationFrame(processFrame);
}

function saveLog() {
  const timestamp = new Date().toLocaleString();
  const imageUrl = canvas.toDataURL("image/png");

  const div = document.createElement("div");
  div.className = "log-item";
  div.innerHTML = `<strong>${timestamp}</strong><br><img src="${imageUrl}" />`;
  logContainer.appendChild(div);

  logs.push({ timestamp, image: imageUrl });
  sendEmailAlert(timestamp, imageUrl);
  uploadToCloud(timestamp, imageUrl);
}

function downloadLogs() {
  const zip = new JSZip();
  logs.forEach((entry, i) => {
    zip.file(`log_${i + 1}.txt`, `Time: ${entry.timestamp}`);
    zip.file(`image_${i + 1}.png`, entry.image.split(",")[1], { base64: true });
  });
  zip.generateAsync({ type: "blob" }).then(content => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "security_logs.zip";
    a.click();
  });
}

function sendEmailAlert(timestamp, imageUrl) {
  // Example stub (replace with EmailJS / backend API call)
  console.log("[EMAIL ALERT]", timestamp);
}

function uploadToCloud(timestamp, imageUrl) {
  // Example stub (replace with Firebase / Cloudinary upload code)
  console.log("[UPLOAD CLOUD]", timestamp);
}
