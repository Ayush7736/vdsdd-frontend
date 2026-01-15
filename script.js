// Compressed Multi-QR Streamer — frontend only
// Requires pako, qrcode.min.js, html5-qrcode

// DOM
const videoPreview = document.getElementById('videoPreview');
const fsBtn = document.getElementById('fsBtn');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const videoFile = document.getElementById('videoFile');
const playFileBtn = document.getElementById('playFileBtn');

const encodeBtn = document.getElementById('encodeBtn');
const base64Output = document.getElementById('base64Output');
const chunkSizeInput = document.getElementById('chunkSize');
const createQRsBtn = document.getElementById('createQRs');
const qrCanvas = document.getElementById('qrCanvas');
const qrIndex = document.getElementById('qrIndex');
const prevQr = document.getElementById('prevQr');
const nextQr = document.getElementById('nextQr');
const autoPlayQr = document.getElementById('autoPlayQr');
const stopAuto = document.getElementById('stopAuto');
const qrControls = document.getElementById('qrControls');
const copyB64 = document.getElementById('copyB64');
const downloadTxt = document.getElementById('downloadTxt');
const estCount = document.getElementById('estCount');
const animFpsInput = document.getElementById('animFps');
const animatedStreamBtn = document.getElementById('animatedStream');
const stopAnimatedBtn = document.getElementById('stopAnimated');

const decodeInput = document.getElementById('decodeInput');
const decodeBtn = document.getElementById('decodeBtn');
const txtUpload = document.getElementById('txtUpload');
const playDecoded = document.getElementById('playDecoded');
const decodedPlayer = document.getElementById('decodedPlayer');

const startScan = document.getElementById('startScan');
const stopScan = document.getElementById('stopScan');
const qrScannerDiv = document.getElementById('qrScanner');
const scanProgress = document.getElementById('scanProgress');
const assembleBtn = document.getElementById('assembleBtn');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');
const manualAdd = document.getElementById('manualAdd');

let qrChunks = [];             // chunked lines
let currentQrIndex = 0;
let autoInterval = null;
let animatedInterval = null;

// Scanned chunks map for decoder
let scannedChunks = new Map();
let scannedTotal = null;
let scannedMime = null;
let scanner = null;

// helpers: base64 <-> Uint8Array
function uint8ArrayToBase64(u8) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

// Fullscreen
fsBtn.addEventListener('click', async () => {
  try { if (videoPreview.requestFullscreen) await videoPreview.requestFullscreen(); } catch(e){}
});

// Load URL to player (CORS caveat)
loadUrlBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) return alert('Paste a direct video URL');
  videoPreview.src = url;
  videoPreview.load();
});

// Play chosen file
playFileBtn.addEventListener('click', () => {
  const f = videoFile.files[0];
  if (!f) return alert('Choose a video first');
  const url = URL.createObjectURL(f);
  videoPreview.src = url;
  videoPreview.play();
});

// Encode: read file as arrayBuffer -> deflate -> base64
encodeBtn.addEventListener('click', async () => {
  const f = videoFile.files[0];
  if (!f) return alert('Select a file to encode (best short clips)');
  try {
    const ab = await f.arrayBuffer();
    const u8 = new Uint8Array(ab);
    const compressed = pako.deflate(u8, { level: 6 });
    const b64 = uint8ArrayToBase64(compressed);
    base64Output.value = b64;
    // store meta for chunk header generation
    base64Output.dataset.mime = f.type || 'video/mp4';
    alert('Encoded & compressed (deflate). Now chunk & generate QRs.');
  } catch (e) {
    console.error(e);
    alert('Encoding failed: ' + e.message);
  }
});

// chunk and create QR deck (each chunk line includes metadata header)
createQRsBtn.addEventListener('click', () => {
  const b64 = base64Output.value.trim();
  if (!b64) return alert('No compressed base64 present. Encode first.');
  const chunkSize = parseInt(chunkSizeInput.value, 10) || 1800;
  const parts = chunkString(b64, chunkSize);
  const id = Date.now().toString(36);
  const mime = base64Output.dataset.mime || 'video/mp4';
  qrChunks = parts.map((p, idx, arr) => {
    // header: VQR|id=<id>|m=<mime>|i=<index>|t=<total>|data=<payload>
    return `VQR|id=${id}|m=${encodeURIComponent(mime)}|i=${idx+1}|t=${arr.length}|data=${p}`;
  });
  currentQrIndex = 0;
  estCount.textContent = qrChunks.length;
  showQr();
  qrControls.classList.remove('hidden');
  downloadTxt.disabled = false;
  alert(`Created ${qrChunks.length} chunks.`);
});

// helper: split string
function chunkString(str, size) {
  const res = [];
  for (let i = 0; i < str.length; i += size) res.push(str.slice(i, i + size));
  return res;
}

// show QR at index (renders to qrCanvas)
function showQr() {
  if (!qrChunks.length) return;
  const payload = qrChunks[currentQrIndex];
  qrCanvas.innerHTML = '';
  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, payload, { width: 260, errorCorrectionLevel: 'M' })
    .then(() => qrCanvas.appendChild(canvas))
    .catch(err => {
      console.error(err);
      qrCanvas.textContent = 'QR render error';
    });
  qrIndex.textContent = `${currentQrIndex+1} / ${qrChunks.length}`;
}

prevQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  currentQrIndex = Math.max(0, currentQrIndex - 1);
  showQr();
});
nextQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  currentQrIndex = Math.min(qrChunks.length - 1, currentQrIndex + 1);
  showQr();
});

// autoplay simple (loop)
autoPlayQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    currentQrIndex = (currentQrIndex + 1) % qrChunks.length;
    showQr();
  }, 900);
});
stopAuto.addEventListener('click', () => {
  if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
});

// animated stream: slow FPS, for phone scanning
animatedStreamBtn.addEventListener('click', () => {
  if (!qrChunks.length) return;
  const fps = Math.max(1, parseInt(animFpsInput.value, 10) || 1);
  const interval = Math.round(1000 / fps);
  if (animatedInterval) clearInterval(animatedInterval);
  animatedInterval = setInterval(() => {
    currentQrIndex = (currentQrIndex + 1) % qrChunks.length;
    showQr();
  }, interval);
});
stopAnimatedBtn.addEventListener('click', () => {
  if (animatedInterval) { clearInterval(animatedInterval); animatedInterval = null; }
});

// copy & download compressed base64
copyB64.addEventListener('click', async () => {
  const t = base64Output.value.trim();
  if (!t) return alert('Nothing to copy');
  try { await navigator.clipboard.writeText(t); alert('Compressed base64 copied'); }
  catch { alert('Clipboard copy failed'); }
});
downloadTxt.addEventListener('click', () => {
  if (!qrChunks.length) return alert('No chunks to download');
  const text = qrChunks.join('\n');
  downloadTextFile('video_chunks.txt', text);
});

// parse and store chunk lines (VQR|...)
function parseAndStoreChunk(text) {
  try {
    if (!text.startsWith('VQR|')) {
      alert('Not a chunk header. Paste a compressed base64 to decode directly.');
      return;
    }
    const parts = text.split('|').slice(1); // ['id=..','m=..','i=..','t=..','data=...']
    const meta = {};
    for (const p of parts) {
      const eq = p.indexOf('=');
      if (eq > 0) {
        const k = p.slice(0, eq), v = p.slice(eq+1);
        meta[k] = v;
      }
    }
    const idx = parseInt(meta.i, 10);
    const total = parseInt(meta.t, 10);
    const payload = meta.data || '';
    const mime = meta.m ? decodeURIComponent(meta.m) : null;
    if (!idx || !total) throw new Error('Invalid metadata');

    scannedChunks.set(idx, payload);
    scannedTotal = total;
    if (mime) scannedMime = mime;
    updateScanProgress();
  } catch (e) {
    console.warn('parse error', e);
  }
}
function updateScanProgress() {
  scanProgress.textContent = `Scanned ${scannedChunks.size} / ${scannedTotal || '?' } chunks.`;
}

// decode compressed base64 (whole) -> inflate -> play
async function decodeCompressedBase64AndPlay(b64, mime) {
  try {
    const compressed = base64ToUint8Array(b64);
    const inflated = pako.inflate(compressed);
    const blob = new Blob([inflated], { type: mime || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    decodedPlayer.src = url;
    decodedPlayer.classList.remove('hidden');
    decodedPlayer.play();
    return url;
  } catch (e) {
    console.error(e);
    alert('Decoding failed: ' + e.message);
  }
}

// decode button: paste or file
decodeBtn.addEventListener('click', async () => {
  const txt = decodeInput.value.trim();
  if (txt) {
    if (txt.startsWith('VQR|')) {
      parseAndStoreChunk(txt);
      alert('Chunk added from paste');
      return;
    } else {
      // assume full compressed base64 and try decode directly (may be large)
      await decodeCompressedBase64AndPlay(txt, 'video/mp4');
      return;
    }
  }
  const f = txtUpload.files[0];
  if (!f) return alert('Paste compressed base64 or upload a .txt of chunks');
  const content = await f.text();
  if (content.includes('VQR|')) {
    const lines = content.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const l of lines) parseAndStoreChunk(l);
    alert('Chunks loaded from file. Assemble to combine.');
  } else {
    await decodeCompressedBase64AndPlay(content.trim(), f.type || 'video/mp4');
  }
});

// manual add
manualAdd.addEventListener('click', () => {
  const txt = prompt('Paste chunk line (VQR|...)');
  if (txt) { parseAndStoreChunk(txt.trim()); alert('Chunk added'); }
});

// assemble scanned chunks in order and decode
assembleBtn.addEventListener('click', async () => {
  if (!scannedTotal) return alert('No chunks scanned/added yet');
  if (scannedChunks.size !== scannedTotal) {
    if (!confirm(`Only ${scannedChunks.size}/${scannedTotal} chunks present. Continue to assemble partial?`)) return;
  }
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || '').join('');
  if (!joined) return alert('No data to assemble');
  await decodeCompressedBase64AndPlay(joined, scannedMime || 'video/mp4');
});

// download reassembled video blob
downloadVideoBtn.addEventListener('click', async () => {
  if (!scannedTotal || scannedChunks.size === 0) return alert('No assembled data');
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || '').join('');
  const compressed = base64ToUint8Array(joined);
  const inflated = pako.inflate(compressed);
  const blob = new Blob([inflated], { type: scannedMime || 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'reassembled_video.mp4';
  document.body.appendChild(a); a.click(); a.remove();
});

// helper: download text file
function downloadTextFile(name, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

// ---------------- QR Scanner (html5-qrcode) ---------------
startScan.addEventListener('click', async () => {
  if (scanner) return;
  // make sure page is HTTPS — the browser enforces this for camera
  if (location.protocol !== 'https:' && !location.hostname.startsWith('127.') && !location.hostname === 'localhost') {
    // don't block, but warn
    console.warn('Camera works best on HTTPS or localhost/127.0.0.1');
  }

  scanner = new Html5Qrcode("qrScanner");
  const config = { fps: 8, qrbox: { width: 280, height: 280 } };
  try {
    await scanner.start({ facingMode: "environment" }, config,
      (decodedText) => {
        console.log('QR scanned:', decodedText);
        // we expect chunk lines VQR|... - but also allow paste of compressed base64 if short
        if (decodedText.startsWith('VQR|')) parseAndStoreChunk(decodedText);
        else {
          // If user scanned a full compressed base64 (rare), try to decode directly
          if (decodedText.length > 100) {
            decodeCompressedBase64AndPlay(decodedText, 'video/mp4');
          } else {
            console.log('Scanned text: ', decodedText);
          }
        }
      },
      (error) => {
        // detection errors are normal; ignore
      }
    );
  } catch (e) {
    console.error(e);
    alert('Scanner failed to start: ' + e.message);
    scanner = null;
  }
});

stopScan.addEventListener('click', async () => {
  if (!scanner) return;
  try {
    await scanner.stop();
    scanner.clear();
    scanner = null;
  } catch (e) { console.warn(e); scanner = null; }
});

// cleanup on unload
window.addEventListener('beforeunload', () => {
  if (scanner) scanner.stop().catch(()=>{});
});
