// --- 1. ประกาศตัวแปร Global ---
let configData = null;

// --- 2. ลงทะเบียน Component (ต้องทำก่อน Scene โหลด) ---
AFRAME.registerComponent('hotspot-handler', {
    schema: { id: { type: 'int' } },
    init: function () {
        // ใช้ทั้ง click และ touchstart เพื่อรองรับทุก Browser
        const el = this.el;
        const handler = (evt) => {
            evt.stopPropagation();
            if (configData) {
                const hpData = configData.hotspots.find(h => h.id === this.data.id);
                showLabel(hpData, el);
            }
        };

        el.addEventListener('click', handler);
        el.addEventListener('touchstart', handler);
    }
});

// --- 3. ฟังก์ชันหลักในการสร้าง Scene ---
async function initApp() {
    const anchor = document.querySelector('#content-anchor');
    const labelContainer = document.querySelector('#label-container');
    const popup = document.querySelector('#popup-panel');

    try {
        const response = await fetch('data.json');
        configData = await response.json();

        // สร้าง Model
        const model = document.createElement('a-entity');
        model.setAttribute('gltf-model', configData.modelUrl);
        model.setAttribute('position', '0 0 0');
        anchor.appendChild(model);

        // สร้าง Hotspots
        configData.hotspots.forEach(hp => {
            const sphere = document.createElement('a-sphere');
            sphere.setAttribute('position', hp.position);
            sphere.setAttribute('radius', '0.15');
            sphere.setAttribute('color', '#FF3300');
            sphere.setAttribute('class', 'clickable'); // สำคัญมากสำหรับ Raycaster
            sphere.setAttribute('hotspot-handler', `id: ${hp.id}`);

            // Animation กะพริบ
            sphere.setAttribute('animation', "property: scale; from: 1 1 1; to: 1.3 1.3 1.3; loop: true; dir: alternate; dur: 800");

            anchor.appendChild(sphere);
        });

        document.getElementById('loading-screen').classList.add('hidden');
        requestAnimationFrame(animate);

    } catch (err) {
        console.error("Error:", err);
    }
}

// ฟังก์ชันแสดง Label
function showLabel(data, meshElement) {
    const container = document.querySelector('#label-container');
    container.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'hotspot-label';
    label.innerHTML = `<strong>${data.name}</strong><br><small>แตะเพื่อดูรายละเอียด</small>`;

    label.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('info-title').innerText = data.name;
        document.getElementById('info-body').innerText = data.description;
        document.getElementById('popup-panel').classList.remove('popup-hidden');
    };

    container.appendChild(label);
    window.activeHotspotData = { div: label, mesh: meshElement };
}

// ปุ่มปิด Popup
document.getElementById('close-btn').onclick = () => {
    document.getElementById('popup-panel').classList.add('popup-hidden');
};

// --- 4. การจัดการ Marker และ Animation ---
const marker = document.querySelector('#main-marker');
const anchorEntity = document.querySelector('#content-anchor');
let isFound = false;

marker.addEventListener('markerFound', () => {
    if (isFound) return;
    isFound = true;
    document.getElementById('scan-hint').classList.add('hidden');

    new TWEEN.Tween({ s: 0 })
        .to({ s: 1 }, 1000)
        .easing(TWEEN.Easing.Back.Out)
        .onUpdate((obj) => {
            anchorEntity.setAttribute('scale', `${obj.s} ${obj.s} ${obj.s}`);
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
        const cam = document.querySelector('[camera]').components.camera.camera;
        const pos = new THREE.Vector3();

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

// เริ่มทำงานเมื่อ DOM พร้อม
window.addEventListener('DOMContentLoaded', initApp);