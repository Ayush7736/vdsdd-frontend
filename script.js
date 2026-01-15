const PROXY_BASE = "https://vdsdd.onrender.com/?url=";
const CHUNK_SIZE = 1024 * 512; // 512KB chunks for stability
let currentData = "";

// 1. HIGH-SPEED CONVERSION (Senior Engineer Method)
function fastBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// 2. PROCESS LOCAL FILE (Encoder)
async function processVideo() {
    const file = document.getElementById("videoInput").files[0];
    if (!file) return alert("Select a video first");

    log("📦 Reading file...");
    const buffer = await file.arrayBuffer();
    
    // We encode the whole file to Base64 for your "Vault" requirement
    log("⚡ Encoding to Base64...");
    const base64 = fastBase64(buffer);
    currentData = `data:${file.type};base64,${base64}`;

    log("✅ Ready! You can now drag the video or download the text.");
    updateUI(currentData, true);
}

// 3. HANDLE STREAMING (Restoring your Proxy)
function streamFromUrl() {
    const url = document.getElementById("urlInput").value.trim();
    if (!url) return;
    
    const proxiedUrl = PROXY_BASE + encodeURIComponent(url);
    currentData = proxiedUrl;
    
    log("🌐 Streaming via Render Proxy...");
    updateUI(proxiedUrl, false);
}

// 4. UI & DRAG-AND-DROP LOGIC
function updateUI(src, isBase64) {
    const video = document.getElementById("player");
    const dragCard = document.getElementById("dragCard");
    
    video.src = src;
    document.getElementById("previewSection").classList.remove("hidden");

    // Enable Drag & Drop
    dragCard.ondragstart = (e) => {
        // Transfers the URL (Proxy) or the DataURI (Base64)
        e.dataTransfer.setData("text/plain", src);
        e.dataTransfer.setData("text/uri-list", src);
        log("🤝 Data attached to cursor!");
    };
}

// 5. DOWNLOAD DATA AS TXT
function saveAsTxt() {
    if (!currentData.startsWith('data:')) return alert("Please convert a local file first.");
    const blob = new Blob([currentData], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "video-vault.txt";
    a.click();
    log("💾 Saved as .txt file");
}
