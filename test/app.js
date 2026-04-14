let modelContainer, camera;

window.onload = () => {
    // ดึงข้อมูลจาก data.json
    fetch('data.json')
        .then(response => response.json())
        .then(config => {
            initARSystem(config);
        });
};

function initARSystem(config) {
    const sceneEl = document.querySelector('a-scene');
    modelContainer = document.querySelector('#model-container');

    // รอให้ A-Frame Scene พร้อมใช้งาน
    sceneEl.addEventListener('loaded', () => {
        camera = sceneEl.camera;

        // ตั้งค่า Marker
        document.querySelector('#dynamic-marker').setAttribute('url', config.markerUrl);

        // Load 3D Model โดยใช้ GLTFLoader จาก THREE (A-Frame context)
        const loader = new THREE.GLTFLoader();
        loader.load(config.modelUrl, (gltf) => {
            const model = gltf.scene;
            model.scale.set(0, 0, 0);

            new TWEEN.Tween(model.scale)
                .to({ x: 1, y: 1, z: 1 }, 1000)
                .easing(TWEEN.Easing.Back.Out)
                .start();

            modelContainer.object3D.add(model);
            createHotspots(config.hotspots);
            hideLoading(); // ปิดหน้าจอโหลด
        }, undefined, (error) => {
            console.error('Error loading model:', error);
            document.querySelector('.loader').innerText = "เกิดข้อผิดพลาดในการโหลดโมเดล";
        });
    });
}

function createHotspots(hotspots) {
    hotspots.forEach(data => {
        const geometry = new THREE.SphereGeometry(0.05, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        const sphere = new THREE.Mesh(geometry, material);

        // แปลง "0 0.5 0.5" เป็นตัวเลข x, y, z
        const pos = data.position.split(' ').map(Number);
        sphere.position.set(pos[0], pos[1], pos[2]);
        sphere.userData = data;

        // Animation
        new TWEEN.Tween(sphere.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 800)
            .yoyo(true)
            .repeat(Infinity)
            .start();

        modelContainer.object3D.add(sphere);
    });
}

function hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('hidden');
}

// เพิ่มฟังก์ชันสำหรับ TWEEN Loop
function animate(time) {
    requestAnimationFrame(animate);
    TWEEN.update(time);
}
requestAnimationFrame(animate);

// ส่วนของ Interactive และ Popup
function onTouch(event) {
    if(!camera) return;
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(modelContainer.object3D.children, true);

    if (intersects.length > 0) {
        const target = intersects.find(i => i.object.userData.name);
        if (target) {
            showPopup(target.object.userData);
        }
    }
}

function showPopup(data) {
    document.getElementById('popup-title').innerText = data.name;
    document.getElementById('popup-desc').innerText = data.description;
    document.getElementById('info-popup').classList.remove('hidden');
}

function closePopup() {
    document.getElementById('info-popup').classList.add('hidden');
}

window.addEventListener('click', onTouch);