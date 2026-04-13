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
    const model = document.createElement('a-entity');
    model.setAttribute('gltf-model', data.modelUrl);
    model.setAttribute('position', '0 0 0');
    anchor.appendChild(model);

    data.hotspots.forEach(hp => {
        const sphere = document.createElement('a-sphere');
        sphere.setAttribute('position', hp.position);
        sphere.setAttribute('radius', '0.15'); // ขยายให้ใหญ่ขึ้นเพื่อทดสอบ
        sphere.setAttribute('color', '#FF3300');
        sphere.setAttribute('class', 'clickable');

        // เรียกใช้ Component ที่เราลงทะเบียนไว้ด้านบน
        sphere.setAttribute('hotspot-handler', `id: ${hp.id}`);

        anchor.appendChild(sphere);
    });

    document.getElementById('loading-screen').classList.add('hidden');
}

function showLabel(data, meshElement) {
    labelContainer.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.innerHTML = `<strong>${data.name}</strong><br><small>แตะเพื่อดูรายละเอียด</small>`;

    // ตั้งค่าให้ Label แสดงผลและกดได้
    label.style.opacity = "1";
    label.style.pointerEvents = "auto";

    label.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-body').innerText = data.description;
        popup.classList.remove('popup-hidden');
    };

    labelContainer.appendChild(label);

    // เก็บค่าไว้ให้ฟังก์ชัน animate นำไปคำนวณตำแหน่ง
    window.activeHotspotData = { div: label, mesh: meshElement };
}

window.addEventListener('click', () => {
    console.log("Screen clicked at", new Date().getTime());
});

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

AFRAME.registerComponent('hotspot-handler', {
    schema: { id: { type: 'int' } },
    init: function () {
        // ใช้ touchstart ร่วมกับ click เพื่อความไวบนมือถือ
        this.el.addEventListener('click', (evt) => {
            console.log("Hit hotspot:", this.data.id); // ดูใน Console ว่าขึ้นไหม
            const hpData = configData.hotspots.find(h => h.id === this.data.id);
            showLabel(hpData, this.el);
        });
    }
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