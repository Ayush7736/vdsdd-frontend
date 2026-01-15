const PROXY_BASE = "https://vdsdd.onrender.com/?url=";

const urlInput = document.getElementById('urlInput');
const previewArea = document.getElementById('previewArea');
const videoPreview = document.getElementById('videoPreview');
const dragCard = document.getElementById('dragCard');
const statusDot = document.getElementById('statusIndicator');

// 1. Check if Render Backend is Awake
async function checkBackend() {
    try {
        const res = await fetch("https://vdsdd.onrender.com/health");
        if (res.ok) statusDot.classList.add('online');
    } catch (e) { console.log("Backend waking up..."); }
}
checkBackend();

// 2. Handle URL Input
urlInput.addEventListener('input', (e) => {
    const rawUrl = e.target.value.trim();
    if (rawUrl.startsWith('http')) {
        const proxiedUrl = PROXY_BASE + encodeURIComponent(rawUrl);
        
        videoPreview.src = proxiedUrl;
        previewArea.classList.remove('hidden');

        // 3. The "Magic" Drag Logic
        dragCard.ondragstart = (event) => {
            // This is what other apps (Notion/Slack) will receive
            event.dataTransfer.setData('text/uri-list', proxiedUrl);
            event.dataTransfer.setData('text/plain', proxiedUrl);
            
            // Visual feedback for the drag ghost
            event.dataTransfer.effectAllowed = "copyLink";
        };
    } else {
        previewArea.classList.add('hidden');
    }
});
