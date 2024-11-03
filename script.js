let scene, camera, renderer, particles, controls;
let synth;
let isPlaying = false;
let activeNotes = new Map(); // Map to store all currently playing notes and their frequencies

const PARTICLE_COUNT = 20000;
const MIN_WALK = 0.002;

// Add this keyboard mapping object after the NOTES declaration
const KEYBOARD_MAPPING = {
    // First row: numbers
    '1': 48,  // C3
    '2': 49,  // C#3
    '3': 50,  // D3
    '4': 51,  // D#3
    '5': 52,  // E3
    '6': 53,  // F3
    '7': 54,  // F#3
    '8': 55,  // G3
    '9': 56,  // G#3
    '0': 57,  // A3
    '-': 58,  // A#3
    '=': 59,  // B3
    // Second row: QWERTY
    'q': 60,  // C4
    'w': 61,  // C#4
    'e': 62,  // D4
    'r': 63,  // D#4
    't': 64,  // E4
    'y': 65,  // F4
    'u': 66,  // F#4
    'i': 67,  // G4
    'o': 68,  // G#4
    'p': 69,  // A4
    // Third row: ASDF
    'a': 70,  // A#4
    's': 71,  // B4
    'd': 72,  // C5
    'f': 73,  // C#5
    'g': 74,  // D5
    'h': 75,  // D#5
    'j': 76,  // E5
    'k': 77,  // F5
    'l': 78,  // F#5
    // Fourth row: ZXCV
    'z': 79,  // G5
    'x': 80,  // G#5
    'c': 81,  // A5
    'v': 82,  // A#5
    'b': 83,  // B5
    'n': 84,  // C6
    'm': 85,  // C#6
    ',': 86,  // D6
    '.': 87   // D#6
};

// Create keyboard UI
function createKeyboard() {
    const keyboard = new Nexus.Piano('#keyboard', {
        size: [800, 150],
        mode: 'button',
        lowNote: 48,     // C3
        highNote: 84     // C6
    });

    const pressedKeys = new Set();

    keyboard.on('change', (note) => {
        if (!synth) initAudio();
        
        const freq = Tone.Frequency(note.note, "midi").toFrequency();
        
        if (note.state) {
            // Note pressed
            synth.triggerAttack(freq);
            activeNotes.set(note.note, freq);
            isPlaying = true;
        } else {
            // Note released
            synth.triggerRelease(freq);
            activeNotes.delete(note.note);
            if (activeNotes.size === 0) {
                isPlaying = false;
            }
        }
    });

    // Computer keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        if (KEYBOARD_MAPPING[key] && !pressedKeys.has(key)) {
            pressedKeys.add(key);
            const midiNote = KEYBOARD_MAPPING[key];
            keyboard.toggleKey(midiNote, true);
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (KEYBOARD_MAPPING[key]) {
            pressedKeys.delete(key);
            const midiNote = KEYBOARD_MAPPING[key];
            keyboard.toggleKey(midiNote, false);
        }
    });

    return keyboard;
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
function updateParticles(patterns) {
    const positions = particles.geometry.attributes.position.array;
    const a = 1, b = 1;
    const vibrationStrength = isPlaying ? 0.02 : 0;

    for (let i = 0; i < positions.length; i += 3) {
        let x = positions[i];
        let y = positions[i + 1];
        
        // Average the Chladni patterns for all active notes
        let totalEq = 0;
        if (patterns.length > 0) {
            totalEq = patterns.reduce((sum, pattern) => {
                return sum + chladniFunction(x, y, a, b, pattern.m, pattern.n);
            }, 0) / patterns.length;
        }
        
        let amplitude = vibrationStrength * Math.abs(totalEq);
        
        if (isPlaying) {
            if (amplitude <= MIN_WALK) amplitude = MIN_WALK;

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
    renderer.setClearColor(0x1a0033); // Dark purple background
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    camera.position.set(0, 0, 2);
    controls.update();

    // Add a plane behind particles
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x330066,  // Darker purple for the plane
        side: THREE.DoubleSide 
    });
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

    const material = new THREE.PointsMaterial({ 
        color: 0x00ffff,  // Cyan particles
        size: 0.003, 
        sizeAttenuation: true 
    });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.getElementById('numberOfParticles').addEventListener('input', updateParticleCount);

    createKeyboard();
    initAudio();
    animate();

    // Add this to your init function after creating the plane
    function addSecretMessage() {
        const loader = new THREE.FontLoader();
        
        loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json', function(font) {
            const textGeometry = new THREE.TextGeometry('Did you enjoy this demo?\nPlease let me know!', {
                font: font,
                size: 0.1,
                height: 0.02,
                align: 'center' // Center align the text
            });
            
            const textMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff00ff  // Magenta text
            });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Center the text
            textGeometry.computeBoundingBox();
            const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
            textMesh.position.set(textWidth/2, 0.3, -0.02); // Center horizontally by offsetting by half width
            
            // Rotate text to face back
            textMesh.rotation.y = Math.PI;
            
            scene.add(textMesh);
        });
    }

    // Call addSecretMessage() at the end of init()
    addSecretMessage();
    
    // Start tutorial after a short delay
    setTimeout(startTutorial, 1000);
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
    
    if (activeNotes.size > 0) {
        const frequencies = Array.from(activeNotes.values());
        const patterns = frequencies.map(freq => {
            const minFrequency = 130.81;  // C3
            const maxFrequency = 1244.51; // D#6
            const scaleFactor = 2;
            const maxM = 16;

            const m1 = Math.floor((freq - minFrequency) / (maxFrequency - minFrequency) * maxM) + 1;
            const n1 = Math.floor((freq - minFrequency) / (maxFrequency - minFrequency) * (maxM / 2)) + 1;

            const m2 = Math.floor(scaleFactor * Math.log2(freq / minFrequency)) + 1;
            const n2 = Math.floor((scaleFactor / 2) * Math.log2(freq / minFrequency)) + 1;

            return {
                m: (m1 + m2) / 2,
                n: (n1 + n2) / 2
            };
        });
        
        updateParticles(patterns);
    } else {
        updateParticles([]);
    }
    
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

// Modify the startTutorial function
function startTutorial() {
    if (localStorage.getItem('tutorialShown')) {
        return;
    }

    const intro = introJs();
    
    intro.setOptions({
        steps: [
            {
                element: document.querySelector('#visualization-area'),
                intro: "Click and drag to rotate the view. Use mouse wheel to zoom in/out.",
                position: 'right'
            },
            {
                element: document.querySelector('#keyboard'),
                intro: "Play notes by clicking the piano keys or using your computer keyboard. Try playing multiple notes at once!",
                position: 'top'
            },
            {
                element: document.querySelector('#controls'),
                intro: "Adjust the number of particles to change the density of the visualization",
                position: 'right'
            }
        ],
        showProgress: true,
        showBullets: false,
        overlayOpacity: 0.7,
        exitOnOverlayClick: false,
        exitOnEsc: false
    });

    intro.oncomplete(() => localStorage.setItem('tutorialShown', 'true'));
    intro.onexit(() => localStorage.setItem('tutorialShown', 'true'));
    
    intro.start();
}

init();
