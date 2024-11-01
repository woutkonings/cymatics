let scene, camera, renderer, particles, controls;
let audioContext, oscillator, isPlaying = false;

const PARTICLE_COUNT = 20000;
const MIN_WALK = 0.002;

function init() {
    // Three.js setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x191919);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    camera.position.set(0, 0, 2);
    controls.update();

    // Add a plane behind particles
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.z = -0.01;
    scene.add(plane);

    // Create particle system
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const geometry = new THREE.BufferGeometry();

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        positions[i] = Math.random() * 2 - 1;     // x in [-1, 1]
        positions[i + 1] = Math.random() * 2 - 1; // y in [-1, 1]
        positions[i + 2] = 0;                     // z
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.003, sizeAttenuation: true });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById('toggleSound').addEventListener('click', toggleSound);
    document.getElementById('freqSlider').addEventListener('input', updateFrequency);
    document.getElementById('numberOfParticles').addEventListener('input', updateParticleCount);

    initAudio();
    animate();
}

// Chladni pattern function
function chladniFunction(x, y, a, b, m, n) {
    const pi = Math.PI;
    x = (x + 1) / 2;
    y = (y + 1) / 2;
    return a * Math.sin(pi * n * x) * Math.sin(pi * m * y) + b * Math.sin(pi * m * x) * Math.sin(pi * n * y);
}

// Update particle positions based on frequency-driven parameters
function updateParticles(m, n) {
    const positions = particles.geometry.attributes.position.array;
    const a = 1, b = 1;
    const vibrationStrength = 0.02;

    for (let i = 0; i < positions.length; i += 3) {
        let x = positions[i];
        let y = positions[i + 1];
        const eq = chladniFunction(x, y, a, b, m, n);
        let amplitude = vibrationStrength * Math.abs(eq);
        if (amplitude <= MIN_WALK) amplitude = MIN_WALK;

        x += (Math.random() - 0.5) * amplitude * 2;
        y += (Math.random() - 0.5) * amplitude * 2;

        x = Math.max(-1, Math.min(1, x));
        y = Math.max(-1, Math.min(1, y));
        const z = amplitude * 0.1;

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Calculate m and n from the current oscillator frequency
    const frequency = oscillator ? oscillator.frequency.value : 440;
    const minFrequency = 50;
    const maxFrequency = 5000;
    const scaleFactor = 2; // Controls how fast complexity increases with frequency
    const maxM = 16;

    const m1 = Math.floor((frequency - minFrequency) / (maxFrequency - minFrequency) * maxM) + 1;
    const n1 = Math.floor((frequency - minFrequency) / (maxFrequency - minFrequency) * (maxM / 2)) + 1;

    const m2 = Math.floor(scaleFactor * Math.log2(frequency / minFrequency)) + 1;
    const n2 = Math.floor((scaleFactor / 2) * Math.log2(frequency / minFrequency)) + 1;

    m = (m1 + m2) / 2;
    n = (n1 + n2) / 2;

    updateParticles(m, n);
    renderer.render(scene, camera);
}

// Resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize the audio context and oscillator
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.connect(audioContext.destination);
    }
}

// Toggle sound on and off
function toggleSound() {
    if (!isPlaying) {
        oscillator.start();
        isPlaying = true;
    } else {
        oscillator.stop();
        initAudio();
        isPlaying = false;
    }
}

// Update the frequency of the oscillator based on the slider
function updateFrequency(event) {
    const frequency = Number(event.target.value);
    if (oscillator) {
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    }
}

// Update particle count while preserving existing particles
function updateParticleCount(event) {
    const newCount = parseInt(event.target.value);
    const currentPositions = particles.geometry.attributes.position.array;
    const currentCount = currentPositions.length / 3;
    
    // Create new positions array with new particle count
    const positions = new Float32Array(newCount * 3);
    
    // Copy existing particles
    const minCount = Math.min(newCount, currentCount);
    for (let i = 0; i < minCount * 3; i++) {
        positions[i] = currentPositions[i];
    }
    
    // If we're adding particles, initialize only the new ones
    if (newCount > currentCount) {
        for (let i = currentCount * 3; i < newCount * 3; i += 3) {
            positions[i] = Math.random() * 2 - 1;     // x in [-1, 1]
            positions[i + 1] = Math.random() * 2 - 1; // y in [-1, 1]
            positions[i + 2] = 0;                     // z
        }
    }
    
    // Update geometry with new positions
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Keep the same material
    const oldMaterial = particles.material;
    
    // Remove old particles and add new ones
    scene.remove(particles);
    particles = new THREE.Points(geometry, oldMaterial);
    scene.add(particles);
}

init();
