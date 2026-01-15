const PROXY_BASE = "https://vdsdd.onrender.com/?url=";
let currentBase64 = "";

// --- ENCODER LOGIC ---

// Handle URL Input (Existing Proxy Tool Logic)
document.getElementById('urlInput').addEventListener('input', async (e) => {
    const url = e.target.value.trim();
    if (url.startsWith('http')) {
        const proxiedUrl = PROXY_BASE + encodeURIComponent(url);
        updatePreview(proxiedUrl);
        // Note: For URLs, we don't automatically convert to Base64 to save RAM
        // unless you use a fetch/blob strategy.
    }
});

// Handle File Input (Convert to Base64)
document.getElementById('fileInput').addEventListener('change', function() {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        currentBase64 = e.target.result;
        updatePreview(currentBase64);
    };
    reader.readAsDataURL(file);
});

function updatePreview(src) {
    const preview = document.getElementById('videoPreview');
    preview.src = src;
    document.getElementById('previewArea').classList.remove('hidden');
    
    // Make Draggable
    document.getElementById('dragCard').ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', src);
    };
}

// Download as .txt
function downloadAsTxt() {
    if (!currentBase64) return alert("Convert a file first!");
    const blob = new Blob([currentBase64], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "video-data.txt";
    link.click();
}

function copyToClipboard() {
    navigator.clipboard.writeText(currentBase64);
    alert("Base64 Copied!");
}

// --- DECODER LOGIC ---

const decodeInput = document.getElementById('decodeInput');
const decodedVideo = document.getElementById('decodedVideo');
const decodeArea = document.getElementById('decodeArea');

// Handle Textarea Paste
decodeInput.addEventListener('input', (e) => {
    const code = e.target.value.trim();
    if (code.startsWith('data:video')) {
        decodedVideo.src = code;
        decodeArea.classList.remove('hidden');
    }
});

// Handle .txt Upload
document.getElementById('txtUpload').addEventListener('change', function() {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result.trim();
        decodeInput.value = content;
        decodedVideo.src = content;
        decodeArea.classList.remove('hidden');
    };
    reader.readAsText(file);
});
