// ar-engine.js & content-loader.js
const scene = document.querySelector('a-scene').object3D;
const marker = document.querySelector('#dynamic-marker');
const modelContainer = document.querySelector('#model-container');

async function initARSystem(config) {
    // 1. Setup Marker
    document.querySelector('#dynamic-marker').setAttribute('url', config.markerUrl);

    // 2. Load 3D Model
    const loader = new THREE.GLTFLoader();
    loader.load(config.modelUrl, (gltf) => {
        const model = gltf.scene;

        // The Reveal Animation
        model.scale.set(0, 0, 0);
        new TWEEN.Tween(model.scale)
            .to({ x: 1, y: 1, z: 1 }, 1000)
            .easing(TWEEN.Easing.Back.Out)
            .start();

        modelContainer.object3D.add(model);
        createHotspots(config.hotspots);
        hideLoading();
    });
}

function createHotspots(hotspots) {
    hotspots.forEach(data => {
        // Create Mesh สำหรับ Hotspot
        const geometry = new THREE.SphereGeometry(0.05, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        const sphere = new THREE.Mesh(geometry, material);

        sphere.position.set(data.position.x, data.position.y, data.position.z);
        sphere.userData = data; // เก็บข้อมูลไว้ในตัวแปร

        // Pulsing Effect (Visual Clues)
        new TWEEN.Tween(sphere.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 800)
            .yoyo(true)
            .repeat(Infinity)
            .start();

        modelContainer.object3D.add(sphere);
    });
}

// 3. Interactive System (Raycasting)
window.addEventListener('click', onTouch);

function onTouch(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, document.querySelector('a-entity[camera]').components.camera.camera);

    const intersects = raycaster.intersectObjects(modelContainer.object3D.children, true);

    if (intersects.length > 0) {
        const target = intersects[0].object;
        if (target.userData.name) {
            showLabel(target);
        }
    }
}

// 4. World to Screen Coordinate (UI Tracking)
function updateLabels() {
    // ฟังก์ชันนี้ต้องรันใน RequestAnimationFrame
    // แปลงตำแหน่ง 3D ของ Hotspot เป็นตำแหน่ง 2D บนหน้าจอ
    const vector = new THREE.Vector3();
    const canvas = document.querySelector('canvas');

    hotspots.forEach(hp => {
        hp.getWorldPosition(vector);
        vector.project(camera);

        const x = (vector.x * .5 + .5) * canvas.clientWidth;
        const y = (vector.y * -.5 + .5) * canvas.clientHeight;

        const label = document.getElementById(`label-${hp.userData.id}`);
        label.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    });
}