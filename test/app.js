// --- Configuration & State ---
let configData = null;
const anchor = document.querySelector('#content-anchor');
const marker = document.querySelector('#main-marker');
const labelContainer = document.querySelector('#label-container');
const popup = document.querySelector('#popup-panel');

// --- 1. Load Data ---
async function loadContent() {
    try {
        const response = await fetch('data.json');
        configData = await response.json();
        setupScene(configData);
    } catch (err) {
        console.error("Failed to load JSON data", err);
    }
}

// --- 2. Setup Scene ---
function setupScene(data) {
    // Load 3D Model
    const model = document.createElement('a-entity');
    model.setAttribute('gltf-model', data.modelUrl);
    model.setAttribute('position', '0 0 0');
    anchor.appendChild(model);

    // Create Hotspots
    data.hotspots.forEach(hp => {
        const sphere = document.createElement('a-sphere');
        sphere.setAttribute('position', hp.position);
        sphere.setAttribute('radius', '0.08');
        sphere.setAttribute('color', '#FF3300');
        sphere.setAttribute('class', 'clickable');

        // Add Pulse Animation
        sphere.setAttribute('animation', `
            property: scale; from: 1 1 1; to: 1.3 1.3 1.3;
            loop: true; dir: alternate; dur: 800
        `);

        // Click Event
        sphere.addEventListener('click', () => {
            showLabel(hp);
        });

        anchor.appendChild(sphere);
    });

    document.getElementById('loading-screen').classList.add('hidden');
}

// --- 3. Interaction Logic ---
function showLabel(data) {
    // Clear previous labels
    labelContainer.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.innerText = `${data.name} (อ่านต่อ...)`;

    label.onclick = () => {
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-body').innerText = data.description;
        popup.classList.remove('popup-hidden');
    };

    labelContainer.appendChild(label);

    // Update label position via Raycasting/Projecting
    window.activeHotspotData = { div: label, pos: data.position };
}

// Close Popup
document.getElementById('close-btn').onclick = () => {
    popup.classList.add('popup-hidden');
};

// --- 4. The Reveal Animation (Marker Found) ---
let isFound = false;

marker.addEventListener('markerFound', () => {
    if (isFound) return; // ป้องกันการรันซ้ำถ้ายังแสดงผลอยู่
    isFound = true;

    document.getElementById('scan-hint').classList.add('hidden');

    // Smooth Scale Up
    new TWEEN.Tween({ s: anchor.getAttribute('scale').x })
        .to({ s: 1 }, 800)
        .easing(TWEEN.Easing.Back.Out)
        .onUpdate((obj) => {
            anchor.setAttribute('scale', `${obj.s} ${obj.s} ${obj.s}`);
        })
        .start();
});

marker.addEventListener('markerLost', () => {
    // แทนที่จะซ่อนทันที ให้รอ 1 วินาทีเผื่อกล้องแค่โฟกัสหลุดชั่วคราว
    setTimeout(() => {
        if (!marker.visible) {
            isFound = false;
            document.getElementById('scan-hint').classList.remove('hidden');
        }
    }, 1000);
});
// Loop for TWEEN and UI Sync
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);

    // Logic to sync Label with 3D Position (Simplified for A-Frame)
    if (window.activeHotspotData && marker.visible) {
        const cam = document.querySelector('[camera]').components.camera.camera;
        const pos = new THREE.Vector3().copy(window.activeHotspotData.pos);

        // Convert local to world
        anchor.object3D.localToWorld(pos);
        pos.project(cam);

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (pos.y * -0.5 + 0.5) * window.innerHeight;

        window.activeHotspotData.div.style.left = `${x}px`;
        window.activeHotspotData.div.style.top = `${y}px`;
    } else if (window.activeHotspotData) {
        window.activeHotspotData.div.style.opacity = "0";
    }
}
requestAnimationFrame(animate);
loadContent();