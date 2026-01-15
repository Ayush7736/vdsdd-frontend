// YOUR RENDER URL
const PROXY_URL = "https://vdsdd.onrender.com/?url=";

// --- 1. STREAMING LOGIC ---
function handleStream() {
    const rawUrl = document.getElementById('streamUrl').value.trim();
    if (!rawUrl) return;

    const finalUrl = PROXY_URL + encodeURIComponent(rawUrl);
    const v = document.getElementById('vStream');
    const status = document.getElementById('streamStatus');
    
    document.getElementById('streamPreview').classList.remove('hidden');
    v.src = finalUrl;
    status.innerText = "Connecting to Proxy...";

    v.oncanplay = () => status.innerText = "Streaming via Proxy (Chunked)";
    v.onerror = () => status.innerHTML = "<span style='color:red'>Proxy Error: Backend might be sleeping or URL is invalid.</span>";

    document.getElementById('dragStream').ondragstart = (e) => {
        e.dataTransfer.setData('text/uri-list', finalUrl);
        e.dataTransfer.setData('text/plain', finalUrl);
    };
}

// --- 2. BASE64 VAULT LOGIC ---
const fileEncoder = document.getElementById('fileEncoder');
const b64Text = document.getElementById('b64Text');
const vVault = document.getElementById('vVault');

// Encode Local File
fileEncoder.onchange = function() {
    const file = this.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = e.target.result;
        b64Text.value = data;
        loadVaultVideo(data);
    };
    reader.readAsDataURL(file);
};

// Decode Textarea or .txt File
b64Text.oninput = () => loadVaultVideo(b64Text.value.trim());

document.getElementById('txtDecoder').onchange = function() {
    const reader = new FileReader();
    reader.onload = (e) => {
        b64Text.value = e.target.result;
        loadVaultVideo(e.target.result);
    };
    reader.readAsText(this.files[0]);
};

function loadVaultVideo(data) {
    if (!data.startsWith('data:video')) return;
    vVault.src = data;
    document.getElementById('vaultPreview').classList.remove('hidden');
    
    document.getElementById('dragVault').ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', data);
    };
}

function downloadTxt() {
    const blob = new Blob([b64Text.value], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "video-vault.txt";
    a.click();
}

function copyB64() {
    navigator.clipboard.writeText(b64Text.value);
    alert("Base64 Copied!");
}
