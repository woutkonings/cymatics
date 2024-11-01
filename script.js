let scene, camera, renderer, particles, controls;

let audioContext, oscillator, isPlaying = false;



// Constants

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

    const planeMaterial = new THREE.MeshBasicMaterial({ 

        color: 0x333333,

        side: THREE.DoubleSide

    });

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



    const material = new THREE.PointsMaterial({

        color: 0xffffff,

        size: 0.003,

        sizeAttenuation: true

    });



    particles = new THREE.Points(geometry, material);

    scene.add(particles);



    // Event listeners

    window.addEventListener('resize', onWindowResize, false);

    document.getElementById('toggleSound').addEventListener('click', toggleSound);



    animate();

}



function chladniFunction(x, y, a, b, m, n) {

    const pi = Math.PI;

    // Convert from [-1,1] to [0,1] for the function

    x = (x + 1) / 2;

    y = (y + 1) / 2;

    return a * Math.sin(pi * n * x) * Math.sin(pi * m * y) + 

           b * Math.sin(pi * m * x) * Math.sin(pi * n * y);

}



function updateParticles() {

    const positions = particles.geometry.attributes.position.array;

    

    const m = Number(document.getElementById('mSlider').value);

    const n = Number(document.getElementById('nSlider').value);

    const a = Number(document.getElementById('aSlider').value);

    const b = Number(document.getElementById('bSlider').value);

    const vibrationStrength = Number(document.getElementById('vSlider').value);



    if (isPlaying && oscillator) {

        const baseFreq = 100;

        const frequency = baseFreq * (m + n) / 2;

        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    }



    for (let i = 0; i < positions.length; i += 3) {

        let x = positions[i];

        let y = positions[i + 1];

        

        const eq = chladniFunction(x, y, a, b, m, n);

        let amplitude = vibrationStrength * Math.abs(eq);

        

        if (amplitude <= MIN_WALK) amplitude = MIN_WALK;



        // Random walk

        x += (Math.random() - 0.5) * amplitude * 2;

        y += (Math.random() - 0.5) * amplitude * 2;



        // Keep particles within bounds [-1, 1]

        x = Math.max(-1, Math.min(1, x));

        y = Math.max(-1, Math.min(1, y));



        // Add small z-displacement for 3D effect

        const z = amplitude * 0.1;



        positions[i] = x;

        positions[i + 1] = y;

        positions[i + 2] = z;

    }



    particles.geometry.attributes.position.needsUpdate = true;

}



function animate() {

    requestAnimationFrame(animate);

    controls.update();

    updateParticles();

    renderer.render(scene, camera);

}



function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}



function toggleSound() {

    if (!audioContext) {

        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        oscillator = audioContext.createOscillator();

        oscillator.connect(audioContext.destination);

    }



    if (!isPlaying) {

        oscillator.start();

        isPlaying = true;

    } else {

        oscillator.stop();

        oscillator = audioContext.createOscillator();

        oscillator.connect(audioContext.destination);

        isPlaying = false;

    }

}



init();
