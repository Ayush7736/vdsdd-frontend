/* Stream ⇄ Base64 ⇄ Multi-QR — frontend only
   Notes: QR libs loaded in HTML:
   - qrcode.min.js (for generation)
   - html5-qrcode.min.js (for scanning)
*/

// ----- DOM
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

const encodeGenerateBtn = document.getElementById('generateQrBtn');

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

let qrChunks = [];             // array of chunk strings
let currentQrIndex = 0;
let autoInterval = null;

// Scanned chunks map for decoder
let scannedChunks = new Map();
let scannedTotal = null;
let scanner = null;

// Basic fullscreen
fsBtn.addEventListener('click', async () => {
  try {
    if (videoPreview.requestFullscreen) await videoPreview.requestFullscreen();
  } catch (e) { console.warn(e); }
});

// Load URL (attempt) -> note CORS limitations
loadUrlBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) return alert('Paste a direct video URL or use upload.');
  // If proxied fetch is required, user can set PROXY_BASE here.
  videoPreview.src = url;
  videoPreview.load();
});

// Play file to player
playFileBtn.addEventListener('click', () => {
  const f = videoFile.files[0];
  if (!f) return alert('Choose a video file first.');
  const url = URL.createObjectURL(f);
  videoPreview.src = url;
  videoPreview.play();
});

// Encode file or active video
encodeBtn.addEventListener('click', async () => {
  const selectedFile = videoFile.files[0];
  if (selectedFile) {
    await encodeFileToBase64(selectedFile);
    return;
  }

  // else try to fetch active src
  const src = videoPreview.src;
  if (!src) return alert('No file selected and no active video src.');
  try {
    // Try to fetch the video blob (CORS may block)
    const resp = await fetch(src);
    if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
    const blob = await resp.blob();
    await blobToBase64(blob);
  } catch (e) {
    alert('Could not fetch video from URL due to CORS. Upload a file instead.');
    console.error(e);
  }
});

async function encodeFileToBase64(file) {
  // Simple approach: readAsDataURL (loads into memory). For short clips only.
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  // dataUrl = "data:video/mp4;base64,AAAA..."
  const base64 = dataUrl.split(',')[1];
  base64Output.value = base64;
  alert('Encoding complete. Generated Base64 is in the textarea.');
}

async function blobToBase64(blob) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  const base64 = dataUrl.split(',')[1];
  base64Output.value = base64;
  alert('Fetched and encoded to Base64 (may be large).');
}

// Copy & download base64 text
copyB64.addEventListener('click', async () => {
  const txt = base64Output.value.trim();
  if (!txt) return alert('No Base64 string to copy.');
  try {
    await navigator.clipboard.writeText(txt);
    alert('Base64 copied to clipboard.');
  } catch (e) {
    alert('Copy failed; maybe browser blocked clipboard.');
  }
});

downloadTxt.addEventListener('click', () => {
  const txt = base64Output.value.trim();
  if (!txt) return alert('Nothing to download.');
  downloadTextFile('video_base64.txt', txt);
});

// Create chunked QRs (from base64Output)
createQRsBtn.addEventListener('click', () => {
  const base64 = base64Output.value.trim();
  if (!base64) return alert('No Base64 to chunk. Encode first.');
  const chunkSize = parseInt(chunkSizeInput.value, 10) || 2000;
  qrChunks = chunkString(base64, chunkSize).map((c, i, arr) => {
    // header + payload:
    // VQR|id=<timestamp>|i=<index>|t=<total>|data=<payload>
    return `VQR|id=${Date.now()}|i=${i+1}|t=${arr.length}|data=${c}`;
  });
  currentQrIndex = 0;
  showQrIndex();
  showQr();
  qrControls.classList.remove('hidden');
  alert(`Created ${qrChunks.length} QR chunks.`);
});

// helper: chunk string
function chunkString(str, size) {
  const res = [];
  for (let i=0;i<str.length;i+=size) res.push(str.slice(i, i+size));
  return res;
}

// Display QR at index
function showQr() {
  if (!qrChunks.length) return;
  const text = qrChunks[currentQrIndex];
  qrCanvas.innerHTML = ''; // clear
  // Use qrcode lib to render to div
  QRCode.toCanvas(document.createElement('canvas'), text, { width: 240 })
    .then(canvas => {
      qrCanvas.appendChild(canvas);
    })
    .catch(err => {
      qrCanvas.textContent = 'QR render error';
      console.error(err);
    });
  showQrIndex();
}

function showQrIndex() {
  qrIndex.textContent = `${currentQrIndex+1} / ${qrChunks.length}`;
}

prevQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  currentQrIndex = Math.max(0, currentQrIndex - 1);
  showQr();
});
nextQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  currentQrIndex = Math.min(qrChunks.length-1, currentQrIndex + 1);
  showQr();
});

autoPlayQr.addEventListener('click', () => {
  if (!qrChunks.length) return;
  if (autoInterval) clearInterval(autoInterval);
  autoInterval = setInterval(() => {
    currentQrIndex = (currentQrIndex + 1) % qrChunks.length;
    showQr();
  }, 900); // ~1 second per QR; adjust if needed
});
stopAuto.addEventListener('click', () => {
  if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
});

// Generate QRs (alias)
document.getElementById('generateQrBtn').addEventListener('click', () => createQRsBtn.click());

// ------------------ Decoder: paste or file ------------------
decodeBtn.addEventListener('click', async () => {
  const txt = decodeInput.value.trim();
  if (txt) {
    // if the pasted text is whole base64 (no header), decode directly
    if (txt.slice(0,4) !== 'VQR|') {
      decodeBase64ToPlay(txt);
      return;
    }
    // else parse as single chunk-like content and store it for assembly
    parseAndStoreChunk(txt);
    alert('Chunk added from paste. Use Assemble to combine.');
    return;
  }
  // else check upload
  const f = txtUpload.files[0];
  if (!f) return alert('Paste a base64 string or upload a .txt');
  const content = await f.text();
  // If the file contains VQR| headers (multi-chunk), parse accordingly
  if (content.includes('VQR|')) {
    // split into lines and add
    const lines = content.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    for (const l of lines) parseAndStoreChunk(l);
    alert('Chunks added from file. Assemble to combine.');
  } else {
    // assume full base64
    decodeBase64ToPlay(content.trim());
  }
});

function parseAndStoreChunk(text) {
  // expected format: VQR|id=...|i=2|t=12|data=<payload>
  try {
    if (!text.startsWith('VQR|')) return;
    const parts = text.split('|').slice(1); // ['id=..','i=..','t=..','data=...']
    const meta = {};
    for (const p of parts) {
      const eq = p.indexOf('=');
      if (eq>0) {
        const k = p.slice(0,eq), v = p.slice(eq+1);
        meta[k]=v;
      }
    }
    const idx = parseInt(meta.i,10);
    const total = parseInt(meta.t,10);
    const payload = meta.data || '';
    if (!idx || !total) throw new Error('Invalid metadata');

    scannedChunks.set(idx, payload);
    scannedTotal = total;
    updateScanProgress();
  } catch (e) {
    console.warn('Parse error', e);
  }
}

function updateScanProgress() {
  const have = scannedChunks.size;
  scanProgress.textContent = `Scanned ${have} / ${scannedTotal || '?'} chunks.`;
}

// decode base64 string directly and play
function decodeBase64ToPlay(b64) {
  try {
    const byteString = atob(b64);
    const arr = new Uint8Array(byteString.length);
    for (let i=0;i<byteString.length;i++) arr[i] = byteString.charCodeAt(i);
    const blob = new Blob([arr], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    decodedPlayer.src = url;
    decodedPlayer.classList.remove('hidden');
    decodedPlayer.play();
  } catch (e) {
    alert('Failed to decode base64. Possibly corrupted or huge.');
    console.error(e);
  }
}

// Manual add button opens prompt to paste a chunk
manualAdd.addEventListener('click', () => {
  const txt = prompt('Paste one QR chunk string (VQR|...)');
  if (txt) {
    parseAndStoreChunk(txt.trim());
    alert('Chunk added.');
  }
});

// Assemble scanned chunks and play
assembleBtn.addEventListener('click', () => {
  if (!scannedTotal) return alert('No scanned chunks present.');
  if (scannedChunks.size !== scannedTotal) {
    if (!confirm(`Only ${scannedChunks.size}/${scannedTotal} chunks present. Continue to assemble partial?`)) return;
  }
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || '').join('');
  if (!joined) return alert('No data to assemble.');
  decodeBase64ToPlay(joined);
});

// download reassembled video
downloadVideoBtn.addEventListener('click', () => {
  if (!scannedTotal || scannedChunks.size===0) return alert('No assembled data.');
  const joined = Array.from({length: scannedTotal}, (_,i) => scannedChunks.get(i+1) || '').join('');
  const byteString = atob(joined);
  const arr = new Uint8Array(byteString.length);
  for (let i=0;i<byteString.length;i++) arr[i]=byteString.charCodeAt(i);
  const blob = new Blob([arr], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reassembled_video.mp4';
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// decode and play into main video preview (copy to player)
playDecoded.addEventListener('click', () => {
  if (!decodedPlayer.src) return alert('No decoded video loaded. Use decoder first.');
  videoPreview.src = decodedPlayer.src;
  videoPreview.play();
});

// Utility: download text file
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ----------------- QR Scanner via html5-qrcode -----------------
startScan.addEventListener('click', () => {
  if (scanner) return;
  scanner = new Html5Qrcode("qrScanner");
  const config = { fps: 10, qrbox: 250 };
  scanner.start({ facingMode: "environment" }, config,
    qrMessage => {
      // on success
      // attempt to parse and add
      parseAndStoreChunk(qrMessage);
    },
    err => {
      // detection errors — ignore or show
      //console.log('scan err', err);
    }
  ).catch(err => {
    alert('Scanner failed to start: ' + err);
  });
});

stopScan.addEventListener('click', () => {
  if (!scanner) return;
  scanner.stop().then(() => {
    scanner.clear();
    scanner = null;
  }).catch(e => console.warn(e));
});

// ----------------- Small UX helpers -----------------
// when page unload, free resources
window.addEventListener('beforeunload', () => {
  if (scanner) {
    scanner.stop().catch(()=>{});
  }
});
