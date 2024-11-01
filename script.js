let scene, camera, renderer, particles, controls;
let audioContext, gainNode, isPlaying = false;
let activeOscillator = null;
let activeNote = null;

const PARTICLE_COUNT = 20000;
const MIN_WALK = 0.002;

// Define musical notes and their frequencies
const A4 = 440;
const NOTES = {
    // Octave 3
    'C3': { freq: A4 * Math.pow(2, -21/12), key: '1' },
    'C#3': { freq: A4 * Math.pow(2, -20/12), key: '2' },
    'D3': { freq: A4 * Math.pow(2, -19/12), key: '3' },
    'D#3': { freq: A4 * Math.pow(2, -18/12), key: '4' },
    'E3': { freq: A4 * Math.pow(2, -17/12), key: '5' },
    'F3': { freq: A4 * Math.pow(2, -16/12), key: '6' },
    'F#3': { freq: A4 * Math.pow(2, -15/12), key: '7' },
    'G3': { freq: A4 * Math.pow(2, -14/12), key: '8' },
    'G#3': { freq: A4 * Math.pow(2, -13/12), key: '9' },
    'A3': { freq: A4 * Math.pow(2, -12/12), key: '0' },
    'A#3': { freq: A4 * Math.pow(2, -11/12), key: '-' },
    'B3': { freq: A4 * Math.pow(2, -10/12), key: '=' },
    // Octave 4
    'C4': { freq: A4 * Math.pow(2, -9/12), key: 'Q' },
    'C#4': { freq: A4 * Math.pow(2, -8/12), key: 'W' },
    'D4': { freq: A4 * Math.pow(2, -7/12), key: 'E' },
    'D#4': { freq: A4 * Math.pow(2, -6/12), key: 'R' },
    'E4': { freq: A4 * Math.pow(2, -5/12), key: 'T' },
    'F4': { freq: A4 * Math.pow(2, -4/12), key: 'Y' },
    'F#4': { freq: A4 * Math.pow(2, -3/12), key: 'U' },
    'G4': { freq: A4 * Math.pow(2, -2/12), key: 'I' },
    'G#4': { freq: A4 * Math.pow(2, -1/12), key: 'O' },
    'A4': { freq: A4 * Math.pow(2, 0/12), key: 'P' },
    // Octave 4 continued
    'A#4': { freq: A4 * Math.pow(2, 1/12), key: 'A' },
    'B4': { freq: A4 * Math.pow(2, 2/12), key: 'S' },
    // Octave 5
    'C5': { freq: A4 * Math.pow(2, 3/12), key: 'D' },
    'C#5': { freq: A4 * Math.pow(2, 4/12), key: 'F' },
    'D5': { freq: A4 * Math.pow(2, 5/12), key: 'G' },
    'D#5': { freq: A4 * Math.pow(2, 6/12), key: 'H' },
    'E5': { freq: A4 * Math.pow(2, 7/12), key: 'J' },
    'F5': { freq: A4 * Math.pow(2, 8/12), key: 'K' },
    'F#5': { freq: A4 * Math.pow(2, 9/12), key: 'L' },
    // Octave 5 continued
    'G5': { freq: A4 * Math.pow(2, 10/12), key: 'Z' },
    'G#5': { freq: A4 * Math.pow(2, 11/12), key: 'X' },
    'A5': { freq: A4 * Math.pow(2, 12/12), key: 'C' },
    'A#5': { freq: A4 * Math.pow(2, 13/12), key: 'V' },
    'B5': { freq: A4 * Math.pow(2, 14/12), key: 'B' },
    // Octave 6
    'C6': { freq: A4 * Math.pow(2, 15/12), key: 'N' },
    'C#6': { freq: A4 * Math.pow(2, 16/12), key: 'M' },
    'D6': { freq: A4 * Math.pow(2, 17/12), key: ',' },
    'D#6': { freq: A4 * Math.pow(2, 18/12), key: '.' }
};

// Create keyboard UI
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    Object.entries(NOTES).forEach(([note, data]) => {
        const isSharp = note.includes('#');
        const key = document.createElement('div');
        key.className = `key ${isSharp ? 'black' : 'white'}`;
        key.dataset.note = note;
        key.innerHTML = `${note}<div class="key-binding">${data.key}</div>`;
        
        // Mouse events
        key.addEventListener('mousedown', () => playNote(note));
        key.addEventListener('mouseup', stopNote);
        key.addEventListener('mouseleave', stopNote);
        
        keyboard.appendChild(key);
    });

    // Keep track of currently pressed keys
    const pressedKeys = new Set();

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent key repeat
        
        const note = Object.entries(NOTES).find(([_, data]) => 
            data.key.toLowerCase() === e.key.toLowerCase()
        )?.[0];
        
        if (note) {
            pressedKeys.add(e.key.toLowerCase());
            playNote(note);
        }
    });

    document.addEventListener('keyup', (e) => {
        const note = Object.entries(NOTES).find(([_, data]) => 
            data.key.toLowerCase() === e.key.toLowerCase()
        )?.[0];
        
        pressedKeys.delete(e.key.toLowerCase());
        
        if (note && pressedKeys.size === 0) {
            // Only stop the sound if no other keys are pressed
            stopNote();
        } else if (pressedKeys.size > 0) {
            // If there are still keys pressed, play the last pressed note
            const lastPressedKey = Array.from(pressedKeys).pop();
            const lastNote = Object.entries(NOTES).find(([_, data]) => 
                data.key.toLowerCase() === lastPressedKey
            )?.[0];
            if (lastNote) {
                playNote(lastNote);
            }
        }
    });
}

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create compressor to help prevent distortion
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-50, audioContext.currentTime);
        compressor.knee.setValueAtTime(40, audioContext.currentTime);
        compressor.ratio.setValueAtTime(12, audioContext.currentTime);
        compressor.attack.setValueAtTime(0, audioContext.currentTime);
        compressor.release.setValueAtTime(0.25, audioContext.currentTime);
        
        // Create master gain node
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.03; // Further reduced master volume
        
        // Connect nodes: gain -> compressor -> destination
        gainNode.connect(compressor);
        compressor.connect(audioContext.destination);
    }
}

function createOscillator(frequency) {
    const osc = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    // Configure oscillator with more precise frequency control
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Smoother envelope
    noteGain.gain.setValueAtTime(0, audioContext.currentTime);
    noteGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.03); // Slightly longer attack
    
    // Add a very slight detuning to make the sound more stable
    osc.detune.setValueAtTime(-2, audioContext.currentTime);
    
    osc.connect(noteGain);
    noteGain.connect(gainNode);
    
    return { oscillator: osc, noteGain: noteGain };
}

function playNote(note) {
    if (!audioContext) initAudio();
    
    // Stop previous note if any
    if (activeOscillator) {
        stopNote();
    }

    const frequency = NOTES[note].freq;
    const { oscillator, noteGain } = createOscillator(frequency);
    activeOscillator = { 
        oscillator: oscillator, 
        noteGain: noteGain 
    };
    
    oscillator.start();
    isPlaying = true;
    activeNote = note;

    // Update UI
    document.querySelector(`[data-note="${note}"]`).classList.add('active');
}

function stopNote() {
    if (activeOscillator) {
        const { oscillator, noteGain } = activeOscillator;
        
        // Longer, smoother release
        const releaseTime = audioContext.currentTime + 0.1;
        noteGain.gain.linearRampToValueAtTime(0, releaseTime);
        
        // Schedule the oscillator to stop after the release
        oscillator.stop(releaseTime + 0.05);
        
        activeOscillator = null;
        isPlaying = false;
        
        document.querySelectorAll('.key').forEach(key => 
            key.classList.remove('active')
        );
        
        activeNote = null;
    }
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

// Add these functions after the NOTES definition and before init()

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
    
    // Calculate m and n from the current oscillator frequency
    const frequency = activeOscillator ? activeOscillator.oscillator.frequency.value : 440;
    const minFrequency = 130.81;  // C3
    const maxFrequency = 1244.51; // D#6
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
