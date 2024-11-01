let scene, camera, renderer, particles, controls;
let audioContext, gainNode, isPlaying = false;
let activeOscillator = null;
let activeNote = null;

const PARTICLE_COUNT = 20000;
const MIN_WALK = 0.002;

// Define musical notes and their frequencies
const NOTES = {
    // Top number row
    'C3': { freq: 130.81, key: '1' },
    'C#3': { freq: 138.59, key: '2' },
    'D3': { freq: 146.83, key: '3' },
    'D#3': { freq: 155.56, key: '4' },
    'E3': { freq: 164.81, key: '5' },
    'F3': { freq: 174.61, key: '6' },
    'F#3': { freq: 185.00, key: '7' },
    'G3': { freq: 196.00, key: '8' },
    'G#3': { freq: 207.65, key: '9' },
    'A3': { freq: 220.00, key: '0' },
    'A#3': { freq: 233.08, key: '-' },
    'B3': { freq: 246.94, key: '=' },
    // Q row
    'C4': { freq: 261.63, key: 'Q' },
    'C#4': { freq: 277.18, key: 'W' },
    'D4': { freq: 293.66, key: 'E' },
    'D#4': { freq: 311.13, key: 'R' },
    'E4': { freq: 329.63, key: 'T' },
    'F4': { freq: 349.23, key: 'Y' },
    'F#4': { freq: 369.99, key: 'U' },
    'G4': { freq: 392.00, key: 'I' },
    'G#4': { freq: 415.30, key: 'O' },
    'A4': { freq: 440.00, key: 'P' },
    // A row
    'A#4': { freq: 466.16, key: 'A' },
    'B4': { freq: 493.88, key: 'S' },
    'C5': { freq: 523.25, key: 'D' },
    'C#5': { freq: 554.37, key: 'F' },
    'D5': { freq: 587.33, key: 'G' },
    'D#5': { freq: 622.25, key: 'H' },
    'E5': { freq: 659.26, key: 'J' },
    'F5': { freq: 698.46, key: 'K' },
    'F#5': { freq: 739.99, key: 'L' },
    // Z row
    'G5': { freq: 783.99, key: 'Z' },
    'G#5': { freq: 830.61, key: 'X' },
    'A5': { freq: 880.00, key: 'C' },
    'A#5': { freq: 932.33, key: 'V' },
    'B5': { freq: 987.77, key: 'B' },
    'C6': { freq: 1046.50, key: 'N' },
    'C#6': { freq: 1108.73, key: 'M' },
    'D6': { freq: 1174.66, key: ',' },
    'D#6': { freq: 1244.51, key: '.' }
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
        // Create a master gain node that stays constant
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.05; // Reduced from 0.1 to prevent distortion
        gainNode.connect(audioContext.destination);
    }
}

function createOscillator(frequency) {
    const osc = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    // Configure oscillator
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // Configure note-specific gain for envelope
    noteGain.gain.setValueAtTime(0, audioContext.currentTime);
    noteGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.02); // Gentle attack
    
    // Connect oscillator through note gain to master gain
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
        
        // Gentle release to prevent clicking
        const releaseTime = audioContext.currentTime + 0.05;
        noteGain.gain.linearRampToValueAtTime(0, releaseTime);
        
        // Schedule the oscillator to stop after the release
        oscillator.stop(releaseTime);
        
        activeOscillator = null;
        isPlaying = false;
        
        // Remove active class from all keys
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

// Modify init() to include keyboard creation
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
