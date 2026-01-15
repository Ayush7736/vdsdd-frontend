// Compressed Multi-QR Streamer — frontend only
// Requires pako, qrcode.min.js, html5-qrcode.min.js

// DOM
const videoPreview = document.getElementById("videoPreview");
const fsBtn = document.getElementById("fsBtn");
const urlInput = document.getElementById("urlInput");
const loadUrlBtn = document.getElementById("loadUrlBtn");
const videoFile = document.getElementById("videoFile");
const playFileBtn = document.getElementById("playFileBtn");

const encodeBtn = document.getElementById("encodeBtn");
const base64Output = document.getElementById("base64Output");
const encodeStatus = document.getElementById("encodeStatus");
const chunkSizeInput = document.getElementById("chunkSize");
const createQRsBtn = document.getElementById("createQRs");
const qrCanvas = document.getElementById("qrCanvas");
const qrIndex = document.getElementById("qrIndex");
const prevQr = document.getElementById("prevQr");
const nextQr = document.getElementById("nextQr");
const autoPlayQr = document.getElementById("autoPlayQr");
const stopAuto = document.getElementById("stopAuto");
const qrControls = document.getElementById("qrControls");
const copyB64 = document.getElementById("copyB64");
const downloadTxt = document.getElementById("downloadTxt");
const estCount = document.getElementById("estCount");
const animFpsInput = document.getElementById("animFps");
const animatedStreamBtn = document.getElementById("animatedStream");
const stopAnimatedBtn = document.getElementById("stopAnimated");

const decodeInput = document.getElementById("decodeInput");
const decodeBtn = document.getElementById("decodeBtn");
const txtUpload = document.getElementById("txtUpload");
const playDecoded = document.getElementById("playDecoded");
const decodedPlayer = document.getElementById("decodedPlayer");

const startScan = document.getElementById("startScan");
const stopScan = document.getElementById("stopScan");
const qrScannerDiv = document.getElementById("qrScanner");
const scanProgress = document.getElementById("scanProgress");
const assembleBtn = document.getElementById("assembleBtn");
const downloadVideoBtn = document.getElementById("downloadVideoBtn");
const manualAdd = document.getElementById("manualAdd");

let qrChunks = [];
let currentQrIndex = 0;
let autoInterval = null;
let animatedInterval = null;

let scannedChunks = new Map();
let scannedTotal = null;
let scannedMime = null;
let scanner = null;

// Helpers
function uint8ToB64(u8) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function b64ToUint8(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// Fullscreen
fsBtn.onclick = async () => {
  try { if (videoPreview.requestFullscreen) await videoPreview.requestFullscreen(); } catch {}
};

// Load URL
loadUrlBtn.onclick = () => {
  const url = urlInput.value.trim();
  if (!url) return alert("Paste a valid URL");
  videoPreview.src = url; videoPreview.load();
};

// Play file
playFileBtn.onclick = () => {
  const f = videoFile.files[0];
  if (!f) return alert("Choose a video file first");
  const url = URL.createObjectURL(f);
  videoPreview.src = url; videoPreview.play();
};

// Encode + compress
encodeBtn.onclick = async () => {
  const f = videoFile.files[0];
  if (!f) {
    encodeStatus.textContent = "❌ No file selected";
    alert("Select a video file to encode");
    return;
  }

  try {
    encodeStatus.textContent = "Reading file…";
    const ab = await f.arrayBuffer();
    const u8 = new Uint8Array(ab);

    encodeStatus.textContent = "Compressing…";
    const compressed = pako.deflate(u8, { level: 6 });

    encodeStatus.textContent = "Base64 encoding…";
    const b64 = uint8ToB64(compressed);

    base64Output.value = b64;
    base64Output.dataset.mime = f.type || "video/mp4";

    encodeStatus.textContent = `✅ Base64 generated (${b64.length} chars)`;
    alert("Base64 generated successfully!");
  } catch (e) {
    console.error(e);
    encodeStatus.textContent = "❌ Encoding failed";
    alert("Encoding failed: " + e.message);
  }
};

// chunk & create QR deck
createQRsBtn.onclick = () => {
  const b64 = base64Output.value.trim();
  if (!b64) {
    alert("No Base64 present. Encode first.");
    return;
  }
  const chunkSize = parseInt(chunkSizeInput.value, 10) || 1800;
  const parts = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    parts.push(b64.slice(i, i + chunkSize));
  }
  const id = Date.now().toString(36);
  const mime = base64Output.dataset.mime;

  qrChunks = parts.map((p, i) => 
    `VQR|id=${id}|m=${encodeURIComponent(mime)}|i=${i+1}|t=${parts.length}|data=${p}`
  );

  currentQrIndex = 0;
  estCount.textContent = qrChunks.length;
  showQr();
  qrControls.classList.remove("hidden");
  alert(`Created ${qrChunks.length} QR chunks`);
};

// show QR
function showQr() {
  if (!qrChunks.length) return;
  const text = qrChunks[currentQrIndex];
  qrCanvas.innerHTML = "";
  const canvas = document.createElement("canvas");
  QRCode.toCanvas(canvas, text, { width: 260 })
    .then(() => qrCanvas.appendChild(canvas))
    .catch(() => qrCanvas.textContent = "QR render error");
  qrIndex.textContent = `${currentQrIndex+1} / ${qrChunks.length}`;
}
prevQr.onclick = () => { currentQrIndex = Math.max(0, currentQrIndex - 1); showQr(); };
nextQr.onclick = () => { currentQrIndex = Math.min(qrChunks.length - 1, currentQrIndex + 1); showQr(); };

autoPlayQr.onclick = () => {
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    currentQrIndex = (currentQrIndex+1) % qrChunks.length;
    showQr();
  }, 900);
};
stopAuto.onclick = () => { if (autoInterval) clearInterval(autoInterval); };

animatedStreamBtn.onclick = () => {
  const fps = Math.max(1, parseInt(animFpsInput.value, 10));
  const interval = Math.round(1000 / fps);
  if (animatedInterval) clearInterval(animatedInterval);
  animatedInterval = setInterval(() => {
    currentQrIndex = (currentQrIndex+1) % qrChunks.length;
    showQr();
  }, interval);
};
stopAnimatedBtn.onclick = () => { if (animatedInterval) clearInterval(animatedInterval); };

// copy & download
copyB64.onclick = async () => {
  const t = base64Output.value.trim();
  if (!t) return alert("Nothing to copy");
  try { await navigator.clipboard.writeText(t); alert("Copied Base64"); }
  catch { alert("Clipboard copy failed"); }
};
downloadTxt.onclick = () => {
  if (!qrChunks.length) return alert("No chunks to download");
  const txt = qrChunks.join("\n");
  const blob = new Blob([txt], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "video_chunks.txt"; a.click();
};

// decode + scanner
function parseAndStoreChunk(txt) {
  if (!txt.startsWith("VQR|")) return;
  const parts = txt.split("|").slice(1);
  const meta = {};
  parts.forEach(p => {
    const eq = p.indexOf("=");
    if (eq > 0) meta[p.slice(0, eq)] = p.slice(eq+1);
  });
  const idx = parseInt(meta.i,10);
  const total = parseInt(meta.t,10);
  const fragment = meta.data || "";

  scannedChunks.set(idx, fragment);
  scannedTotal = total;
  const m = meta.m && decodeURIComponent(meta.m);
  if (m) scannedMime = m;

  scanProgress.textContent = `Scanned ${scannedChunks.size} / ${scannedTotal}`;

}

decodeBtn.onclick = async () => {
  const txt = decodeInput.value.trim();
  if (txt) {
    if (txt.startsWith("VQR|")) {
      parseAndStoreChunk(txt);
      alert("Chunk added from paste");
      return;
    } else {
      // treat as full compressed base64
      const inflated = pako.inflate(b64ToUint8(txt));
      const blob = new Blob([inflated], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      decodedPlayer.src = url;
      decodedPlayer.classList.remove("hidden");
      decodedPlayer.play();
      return;
    }
  }
  const f = txtUpload.files[0];
  if (!f) return alert("Paste or upload first");
  const content = await f.text();
  if (content.includes("VQR|")) {
    content.split(/\r?\n/).forEach(line => parseAndStoreChunk(line.trim()));
    alert("Chunks loaded from file");
  } else {
    const inflated = pako.inflate(b64ToUint8(content));
    const blob = new Blob([inflated], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    decodedPlayer.src = url;
    decodedPlayer.classList.remove("hidden");
    decodedPlayer.play();
  }
};

assembleBtn.onclick = async () => {
  if (!scannedTotal) return alert("No scanned chunks");
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || "").join("");
  if (!joined) return alert("Incomplete data");
  const inflated = pako.inflate(b64ToUint8(joined));
  const blob = new Blob([inflated], { type: scannedMime || "video/mp4" });
  const url = URL.createObjectURL(blob);
  decodedPlayer.src = url;
  decodedPlayer.classList.remove("hidden");
  decodedPlayer.play();
};

downloadVideoBtn.onclick = () => {
  if (!scannedTotal) return alert("No assembled video");
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || "").join("");
  const inflated = pako.inflate(b64ToUint8(joined));
  const blob = new Blob([inflated], { type: scannedMime || "video/mp4" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "decoded_video.mp4"; a.click();
};

let scanner = null;
startScan.onclick = async () => {
  if (scanner) return;
  scanner = new Html5Qrcode("qrScanner");
  try {
    await scanner.start({ facingMode: "environment" }, { fps: 8, qrbox: { width: 280, height: 280 } },
      decodedText => { parseAndStoreChunk(decodedText); },
      () => {}
    );
  } catch (e) {
    alert("Scanner start failed");
    scanner = null;
  }
};
stopScan.onclick = async () => {
  if (!scanner) return;
  await scanner.stop(); scanner.clear(); scanner = null;
};
manualAdd.onclick = () => {
  const txt = prompt("Paste a chunk line (VQR|...)");
  if (txt) { parseAndStoreChunk(txt.trim()); alert("Chunk added"); }
};
