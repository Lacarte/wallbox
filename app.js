/**
 * Main Application Logic
 */

// Global Variables
let scene, camera, renderer, controls;
let box, unfoldController, flatPattern;
let animationId;

// Initialization
function init() {
    // 1. Scene Setup
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4f8);

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(50, 40, 60);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    document.getElementById('loading').style.display = 'none';

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Grid (Hidden by default or subtle)
    const grid = new THREE.GridHelper(200, 50, 0xccd6e0, 0xeef2f5);
    grid.position.y = -40; // below box
    scene.add(grid);
    window.gridHelper = grid; // Global ref for toggle

    // 2. Create Box
    box = new TrapezoidBox(scene);

    // 3. Animation Controller
    unfoldController = new UnfoldController(box, camera);

    // 4. Flat Pattern Overlay - DISABLED (using pure 3D view)
    // flatPattern = new FlatPatternRenderer(box);
    flatPattern = { canvas: { style: {} } }; // Dummy object to prevent errors

    // 5. Event Listeners
    setupEventListeners();

    // 6. Start Loop
    animate();

    // Initial UI Update
    updateSpecifications();

    // Initialize animation at 0% (flat state)
    unfoldController.update(0);
    updateStatusText(0);
}

function setupEventListeners() {
    // Resize
    window.addEventListener('resize', onWindowResize);

    // Dimension Sliders
    const dimInputs = ['topWidth', 'bottomWidth', 'height', 'depth', 'flapWidth'];
    dimInputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', (e) => {
            // Update Number Display
            document.getElementById('val-' + id).textContent = parseFloat(e.target.value).toFixed(1);

            // Update Box Geometry
            updateBoxGeometry();
        });
    });

    // Unfold Slider
    const unfoldSlider = document.getElementById('unfold');
    unfoldSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const progress = val / 100; // 0 to 1

        // Update Animation
        unfoldController.update(progress);

        // Update Status Text
        updateStatusText(progress);

        // Show/Hide Flat Pattern
        // Disabled as per user request (pure 3D view is sufficient)
        /*
        if (progress > 0.95) {
            flatPattern.canvas.style.opacity = '1';
            flatPattern.draw();
        } else {
            flatPattern.canvas.style.opacity = '0';
        }
        */
        flatPattern.canvas.style.opacity = '0';
    });

    // Buttons
    document.getElementById('btn-reset-cam').addEventListener('click', () => {
        camera.position.set(50, 40, 60);
        controls.reset();
    });

    document.getElementById('btn-wireframe').addEventListener('click', () => {
        scene.traverse(obj => {
            if (obj.isMesh) {
                obj.material.wireframe = !obj.material.wireframe;
            }
        });
    });

    document.getElementById('btn-grid').addEventListener('click', () => {
        window.gridHelper.visible = !window.gridHelper.visible;
    });

    let autoRotate = false;
    document.getElementById('btn-auto-rotate').addEventListener('click', (e) => {
        autoRotate = !autoRotate;
        controls.autoRotate = autoRotate;
        e.target.textContent = `Auto-Rotate: ${autoRotate ? 'On' : 'Off'}`;
        // If auto-rotate is on, we must enable it in controls
        e.target.classList.toggle('active', autoRotate);
    });
}

function updateBoxGeometry(rebuild = true) {
    const params = {
        topWidth: parseFloat(document.getElementById('topWidth').value),
        bottomWidth: parseFloat(document.getElementById('bottomWidth').value),
        height: parseFloat(document.getElementById('height').value),
        depth: parseFloat(document.getElementById('depth').value),
        flapWidth: parseFloat(document.getElementById('flapWidth').value),
    };

    if (rebuild) {
        box.updateDimensions(params);
        // Reset Controller Rest Poses after geometry change!
        unfoldController.saveRestPose();

        // Re-apply current animation state
        const progress = parseFloat(document.getElementById('unfold').value) / 100;
        unfoldController.update(progress);

        // Update 2D if visible
        if (progress > 0.95) flatPattern.draw();
    }

    updateSpecifications(params);
}

function updateSpecifications(params) {
    if (!params) {
        // Fetch current if not passed
        params = {
            topWidth: box.tw,
            bottomWidth: box.bw,
            height: box.h,
            depth: box.d,
            flapWidth: box.fw
        };
    }

    // Total Width (Flat Pattern W rough estimate)
    // LeftSlant + Back(MaxW) + RightSlant
    const dx = (params.topWidth - params.bottomWidth) / 2;
    const slantH = Math.sqrt(dx * dx + params.height * params.height);
    const totalW = params.topWidth + 2 * (slantH + params.flapWidth);
    // Approx, technically depends on flap angle

    // Total Height (Center column)
    const totalH = params.flapWidth + params.depth + params.height + params.depth + params.flapWidth;

    // Surface Area
    // Back (Trapezoid): h * (tw+bw)/2
    const areaBack = params.height * (params.topWidth + params.bottomWidth) / 2;
    // Bottom: bw * d
    const areaBottom = params.bottomWidth * params.depth;
    // Lid: tw * d
    const areaLid = params.topWidth * params.depth;
    // Sides: d * slantH * 2
    const areaSides = 2 * (params.depth * slantH);
    // Flaps...
    // LidFlap (tw*fw), BottomFlap (bw*fw), SideFlaps (fw*slantH * 2)
    const areaFlaps = (params.topWidth * params.flapWidth) +
        (params.bottomWidth * params.flapWidth) +
        (2 * params.flapWidth * slantH);

    const totalArea = areaBack + areaBottom + areaLid + areaSides + areaFlaps;

    document.getElementById('spec-totalWidth').textContent = totalW.toFixed(1) + ' cm';
    document.getElementById('spec-totalHeight').textContent = totalH.toFixed(1) + ' cm';
    document.getElementById('spec-area').textContent = totalArea.toFixed(1) + ' cm²';
}

function updateStatusText(progress) {
    const status = document.getElementById('unfoldStatus');

    // Calculate closing progress
    const maxAngleDeg = 90; // 90 degrees to lay flat
    const closingPercent = (progress * 100).toFixed(0);
    const openAngleDeg = ((1 - progress) * maxAngleDeg).toFixed(0);

    let text = `Fully Open (Flat 2D Pattern)`;
    if (progress > 0.01 && progress < 0.99) {
        text = `Closing: ${closingPercent}% (${openAngleDeg}° open)`;
    } else if (progress >= 0.99) {
        text = `Box Assembled`;
    }

    status.textContent = text;
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Start
init();
