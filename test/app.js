// --- 1. ต้องลงทะเบียน Component ก่อนการเรียกใช้งานเสมอ ---
AFRAME.registerComponent('hotspot-handler', {
    schema: { id: { type: 'int' } },
    init: function () {
        this.el.addEventListener('click', (evt) => {
            // ป้องกัน Event ส่งต่อไปยังส่วนอื่น
            evt.stopPropagation();

            if (typeof configData !== 'undefined' && configData) {
                const hpData = configData.hotspots.find(h => h.id === this.data.id);
                // เรียกฟังก์ชันแสดง Label
                showLabel(hpData, this.el);
            }
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
        sphere.setAttribute('position', hp.position);
        sphere.setAttribute('radius', '0.15'); // ขนาดใหญ่พอให้แตะง่าย
        sphere.setAttribute('color', '#FF3300');
        sphere.setAttribute('class', 'clickable'); // ต้องตรงกับ raycaster objects

        // ผูก Component ที่เราสร้างไว้ข้างบน
        sphere.setAttribute('hotspot-handler', `id: ${hp.id}`);

        // เพิ่ม Animation กะพริบ
        sphere.setAttribute('animation', "property: scale; from: 1 1 1; to: 1.3 1.3 1.3; loop: true; dir: alternate; dur: 800");

        anchor.appendChild(sphere);
    });

    // ซ่อน Loading เมื่อพร้อม
    const loading = document.getElementById('loading-screen');
    if(loading) loading.classList.add('hidden');
}

function showLabel(data, meshElement) {
    labelContainer.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.innerHTML = `<strong>${data.name}</strong><br><small>อ่านรายละเอียด...</small>`;

    // เมื่อกดที่ Label ให้เปิด Popup
    label.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-body').innerText = data.description;
        popup.classList.remove('popup-hidden');
    };

    labelContainer.appendChild(label);

    // เก็บข้อมูลไว้ให้ฟังก์ชัน animate คำนวณตำแหน่ง World to Screen
    window.activeHotspotData = { div: label, mesh: meshElement };
}

// ปุ่มปิด Popup
document.getElementById('close-btn').onclick = () => {
    popup.classList.add('popup-hidden');
};

// --- 4. Logic การปรากฏของโมเดล (The Reveal) ---
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

// Loop สำหรับ Update ตำแหน่ง UI ตามจุด 3D
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);

    if (window.activeHotspotData && marker.visible) {
        const camEl = document.querySelector('[camera]');
        if (!camEl) return;

        const cam = camEl.components.camera.camera;
        const pos = new THREE.Vector3();

        // ดึงพิกัดจริงของจุดสีแดงในโลก 3D
        window.activeHotspotData.mesh.object3D.getWorldPosition(pos);

        // แปลงเป็นพิกัดหน้าจอ (World to Screen)
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