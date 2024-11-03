let scene, camera, renderer, particles, controls;
let synth;
let isPlaying = false;
let activeNote = null;

const PARTICLE_COUNT = 20000;
const MIN_WALK = 0.002;


// Create keyboard UI
function createKeyboard() {
    const keyboard = new Nexus.Piano('#keyboard', {
        size: [800, 150],
        mode: 'button',
        lowNote: 48,     // C3
        highNote: 84     // C6
    });

    keyboard.on('change', (note) => {
        if (!synth) initAudio();
        
        const freq = Tone.Frequency(note.note, "midi").toFrequency();
        
        if (note.state) {
            // Note pressed
            synth.triggerAttack(freq);
            isPlaying = true;
            activeNote = freq;
        } else {
            // Note released
            synth.triggerRelease(freq);
            if (!keyboard.keys.some(k => k.state)) {
                isPlaying = false;
                activeNote = null;
            }
        }
    });

    // Computer keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const note = keyboard.getKeyFromComputer(e);
        if (note) {
            keyboard.toggleKey(note, true);
        }
    });

    document.addEventListener('keyup', (e) => {
        const note = keyboard.getKeyFromComputer(e);
        if (note) {
            keyboard.toggleKey(note, false);
        }
    });
}

// Replace our audio initialization with Tone.js
function initAudio() {
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: "sine"
        },
        envelope: {
            attack: 0.03,
            decay: 0.1,
            sustain: 0.3,
            release: 0.1
        },
        volume: -12
    }).toDestination();
}

// Update particle positions based on frequency-driven parameters
function updateParticles(m, n) {
    const positions = particles.geometry.attributes.position.array;
    const a = 1, b = 1;
    const vibrationStrength = isPlaying ? 0.02 : 0;

    for (let i = 0; i < positions.length; i += 3) {
        let x = positions[i];
        let y = positions[i + 1];
        const eq = chladniFunction(x, y, a, b, m, n);
        let amplitude = vibrationStrength * Math.abs(eq);
        if (isPlaying && amplitude <= MIN_WALK) amplitude = MIN_WALK;

        if (isPlaying) {
            x += (Math.random() - 0.5) * amplitude * 2;
            y += (Math.random() - 0.5) * amplitude * 2;
            x = Math.max(-1, Math.min(1, x));
            y = Math.max(-1, Math.min(1, y));
        }
        
        const z = isPlaying ? amplitude * 0.1 : 0;

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}


function generateLetterW(centerX, centerY, width, height, thickness) {
    const points = [];
    const segments = 50;
    
    function addLinePoints(x1, y1, x2, y2, count) {
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const randX = (Math.random() - 0.5) * thickness;
            const randY = (Math.random() - 0.5) * thickness;
            points.push({
                x: x1 + (x2 - x1) * t + randX,
                y: y1 + (y2 - y1) * t + randY
            });
        }
    }
    
    // Define points for two V shapes
    const leftX = centerX - width/2;
    const rightX = centerX + width/2;
    const topY = centerY + height/2;
    const bottomY = centerY - height/2;
    
    // First V (left side)
    const v1Center = centerX - width/4;
    addLinePoints(leftX, topY, v1Center, bottomY, segments); // Left diagonal
    addLinePoints(v1Center, bottomY, centerX, topY, segments); // Right diagonal
    
    // Second V (right side)
    const v2Center = centerX + width/4;
    addLinePoints(centerX, topY, v2Center, bottomY, segments); // Left diagonal
    addLinePoints(v2Center, bottomY, rightX, topY, segments); // Right diagonal
    
    // Add extra points at the intersections for better definition
    const intersectionPoints = [
        { x: centerX, y: topY },      // Middle top
        { x: v1Center, y: bottomY },  // Left bottom
        { x: v2Center, y: bottomY }   // Right bottom
    ];
    
    intersectionPoints.forEach(point => {
        for (let i = 0; i < 10; i++) {
            points.push({
                x: point.x + (Math.random() - 0.5) * thickness,
                y: point.y + (Math.random() - 0.5) * thickness
            });
        }
    });
    
    return points;
}

function generateLetterK(centerX, centerY, width, height, thickness) {
    const points = [];
    const segments = 50; // Reduced for more concentrated points
    
    // Helper function to add points along a line with controlled randomness
    function addLinePoints(x1, y1, x2, y2, count) {
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const randX = (Math.random() - 0.5) * thickness;
            const randY = (Math.random() - 0.5) * thickness;
            points.push({
                x: x1 + (x2 - x1) * t + randX,
                y: y1 + (y2 - y1) * t + randY
            });
        }
    }
    
    const stemX = centerX - width/4;
    const topY = centerY + height/2;
    const bottomY = centerY - height/2;
    const middleY = centerY;
    const rightX = centerX + width/2;
    
    // Vertical stem
    addLinePoints(stemX, topY, stemX, bottomY, segments * 2);
    
    // Upper diagonal
    addLinePoints(stemX, middleY, rightX, topY, segments);
    
    // Lower diagonal
    addLinePoints(stemX, middleY, rightX, bottomY, segments);
    
    // Add extra points at intersections for better definition
    for (let i = 0; i < 10; i++) {
        points.push({
            x: stemX + (Math.random() - 0.5) * thickness,
            y: middleY + (Math.random() - 0.5) * thickness
        });
    }
    
    return points;
}

// Modify the particle initialization in init()
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

    // Generate points for WK
    const letterPoints = [
        ...generateLetterW(-0.3, 0, 0.7, 0.5, 0.01), // Adjusted width and height
        ...generateLetterK(0.3, 0, 0.6, 0.6, 0.01)
    ];

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        if (i/3 < letterPoints.length) {
            // Use letter points for the first portion of particles
            positions[i] = letterPoints[i/3].x;
            positions[i + 1] = letterPoints[i/3].y;
            positions[i + 2] = 0;
        } else {
            // Distribute remaining particles randomly around the letters
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.2 + 0.75;
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = Math.sin(angle) * radius;
            positions[i + 2] = 0;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.003, sizeAttenuation: true });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById('numberOfParticles').addEventListener('input', updateParticleCount);

    createKeyboard();
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Calculate m and n from the current frequency
    const frequency = activeNote || 440;
    const minFrequency = 130.81;  // C3
    const maxFrequency = 1244.51; // D#6
    const scaleFactor = 2;
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
