// --- 1. ต้องลงทะเบียน Component ก่อนเพื่อน ---
AFRAME.registerComponent('hotspot-handler', {
    schema: { id: { type: 'int' } },
    init: function () {
        this.el.addEventListener('click', (evt) => {
            // ป้องกัน Event ซ้อนทับ
            evt.stopPropagation();
            const hpData = configData.hotspots.find(h => h.id === this.data.id);
            showLabel(hpData, this.el);
        });
    }
});

// --- Configuration & State ---
let configData = null;
const anchor = document.querySelector('#content-anchor');
const marker = document.querySelector('#main-marker');
const labelContainer = document.querySelector('#label-container');
const popup = document.querySelector('#popup-panel');

// --- 2. Load Data ---
async function loadContent() {
    try {
        const response = await fetch('data.json');
        configData = await response.json();
        setupScene(configData);
    } catch (err) {
        console.error("Failed to load JSON data", err);
        alert("ไม่สามารถโหลด data.json ได้");
    }
}

// --- 3. Setup Scene ---
function setupScene(data) {
    const model = document.createElement('a-entity');
    model.setAttribute('gltf-model', data.modelUrl);
    model.setAttribute('position', '0 0 0');
    anchor.appendChild(model);

    data.hotspots.forEach(hp => {
        const sphere = document.createElement('a-sphere');
        // แปลงพิกัดจาก String ใน JSON เป็น Vector
        sphere.setAttribute('position', hp.position);
        sphere.setAttribute('radius', '0.15');
        sphere.setAttribute('color', '#FF3300');
        sphere.setAttribute('class', 'clickable');
        sphere.setAttribute('hotspot-handler', `id: ${hp.id}`);

        // เพิ่ม Pulse Animation
        sphere.setAttribute('animation', "property: scale; from: 1 1 1; to: 1.3 1.3 1.3; loop: true; dir: alternate; dur: 800");

        anchor.appendChild(sphere);
    });

    // ซ่อน Loading Screen เมื่อทุกอย่างพร้อม
    document.getElementById('loading-screen').classList.add('hidden');
}

function showLabel(data, meshElement) {
    labelContainer.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.innerHTML = `<strong>${data.name}</strong><br><small>แตะเพื่อดูรายละเอียด</small>`;

    label.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-body').innerText = data.description;
        popup.classList.remove('popup-hidden');
    };

    labelContainer.appendChild(label);

    // เก็บ Mesh และข้อมูลตำแหน่งเพื่อใช้ใน animate
    window.activeHotspotData = { div: label, mesh: meshElement, rawPos: data.position };
}

// Close Popup
document.getElementById('close-btn').onclick = () => {
    popup.classList.add('popup-hidden');
};

// --- 4. Animation Logic ---
let isFound = false;

marker.addEventListener('markerFound', () => {
    if (isFound) return;
    isFound = true;
    document.getElementById('scan-hint').classList.add('hidden');

    new TWEEN.Tween({ s: 0 })
        .to({ s: 1 }, 1000)
        .easing(TWEEN.Easing.Back.Out)
        .onUpdate((obj) => {
            anchor.setAttribute('scale', `${obj.s} ${obj.s} ${obj.s}`);
        })
        .start();
});

marker.addEventListener('markerLost', () => {
    setTimeout(() => {
        if (!marker.visible) {
            isFound = false;
            document.getElementById('scan-hint').classList.remove('hidden');
        }
    }, 1000);
});

function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);

    if (window.activeHotspotData && marker.visible) {
        const camEntity = document.querySelector('[camera]');
        if (!camEntity) return;

        const cam = camEntity.components.camera.camera;
        const pos = new THREE.Vector3();

        // ดึงตำแหน่ง World Position ของจุดสีแดง
        window.activeHotspotData.mesh.object3D.getWorldPosition(pos);
        pos.project(cam);

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (pos.y * -0.5 + 0.5) * window.innerHeight;

        window.activeHotspotData.div.style.left = `${x}px`;
        window.activeHotspotData.div.style.top = `${y}px`;
        window.activeHotspotData.div.style.opacity = "1";
    } else if (window.activeHotspotData) {
        window.activeHotspotData.div.style.opacity = "0";
    }
}

requestAnimationFrame(animate);
loadContent();