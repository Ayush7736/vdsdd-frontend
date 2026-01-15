const videoPreview = document.getElementById('videoPreview');
const fsBtn = document.getElementById('fsBtn');
const urlInput = document.getElementById('urlInput');
const loadUrlBtn = document.getElementById('loadUrlBtn');
const videoFile = document.getElementById('videoFile');
const playFileBtn = document.getElementById('playFileBtn');

const encodeBtn = document.getElementById('encodeBtn');
const base64Output = document.getElementById('base64Output');
const copyB64 = document.getElementById('copyB64');
const downloadTxt = document.getElementById('downloadTxt');

const decodeInput = document.getElementById('decodeInput');
const txtUpload = document.getElementById('txtUpload');
const decodeBtn = document.getElementById('decodeBtn');
const decodedPlayer = document.getElementById('decodedPlayer');
const downloadVideoBtn = document.getElementById('downloadVideoBtn');

// Fullscreen toggle
fsBtn.onclick = () => {
  if (videoPreview.requestFullscreen) videoPreview.requestFullscreen();
};

// Load URL into player
loadUrlBtn.onclick = () => {
  const url = urlInput.value.trim();
  if (!url) return alert("Paste a direct mp4 URL.");
  videoPreview.src = url;
  videoPreview.load();
  videoPreview.play();
};

// Play uploaded file
playFileBtn.onclick = () => {
  const file = videoFile.files[0];
  if (!file) return alert("Choose a video file.");
  const url = URL.createObjectURL(file);
  videoPreview.src = url;
  videoPreview.play();
};

// Encode button
encodeBtn.onclick = async () => {
  // If a file is selected, encode it
  const file = videoFile.files[0];
  if (file) {
    await readFileAsBase64(file);
    return;
  }
  // Otherwise fetch video src
  const src = videoPreview.src;
  if (!src) return alert("No active video to encode.");

  try {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error("fetch fail");
    const blob = await resp.blob();
    await readFileAsBase64(blob);
  } catch (e) {
    alert("Remote video may be blocked by CORS. Upload a file instead.");
  }
};

async function readFileAsBase64(blob) {
  const dataUrl = await new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
  // dataURL format: data:...;base64,<base64>
  base64Output.value = dataUrl.split(",")[1];
  alert("Encoding complete!");
}

// Copy Base64
copyB64.onclick = async () => {
  const txt = base64Output.value.trim();
  if (!txt) return alert("No Base64 to copy.");
  try {
    await navigator.clipboard.writeText(txt);
    alert("Copied!");
  } catch {
    alert("Clipboard failed.");
  }
};

// Download Base64 as .txt
downloadTxt.onclick = () => {
  const txt = base64Output.value.trim();
  if (!txt) return alert("No Base64 to download.");
  const blob = new Blob([txt], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "video_base64.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

// Decode Base64
decodeBtn.onclick = async () => {
  // From paste
  const pasted = decodeInput.value.trim();
  if (pasted) {
    decodeBase64AndPlay(pasted);
    return;
  }
  // From txt upload
  const f = txtUpload.files[0];
  if (!f) return alert("Paste base64 or upload .txt");
  const text = await f.text();
  decodeBase64AndPlay(text.trim());
};

function decodeBase64AndPlay(b64) {
  try {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    const blob = new Blob([arr], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    decodedPlayer.src = url;
    decodedPlayer.classList.remove("hidden");
    decodedPlayer.play();
  } catch (e) {
    alert("Decode failed — invalid base64?");
  }
}

// Download decoded video
downloadVideoBtn.onclick = () => {
  const url = decodedPlayer.src;
  if (!url) return alert("No decoded video available.");
  const a = document.createElement("a");
  a.href = url;
  a.download = "decoded_video.mp4";
  document.body.appendChild(a);
  a.click();
  a.remove();
};
