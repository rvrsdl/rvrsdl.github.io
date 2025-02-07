import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Set up scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize OrbitControls
let orbitControls = new OrbitControls(camera, renderer.domElement);
let overviewMode = false;
// Load a rough texture for the walls
const textureLoader = new THREE.TextureLoader();
const wallTexture = textureLoader.load('./imgs/brick_wall_texture_800x500.JPG'); // Replace with your texture path
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(1, 1);
const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
// Load wood texture for the floor
const floorTexture = textureLoader.load('./imgs/Wood_pattern_parquet_floor_tiles.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(4, 4);

const wallMaterial = new THREE.MeshBasicMaterial({ map: wallTexture });

const floorMaterial = new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide });

// Store wall positions for collision detection
let wallPositions = [];

// Create player
const playerGeometry = new THREE.ConeGeometry(0.3, 1, 32);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);

// Create finish point
let finishGeometry = new THREE.CircleGeometry(0.4, 32);
let finishMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
let finish = new THREE.Mesh(finishGeometry, finishMaterial);
finish.rotation.x = -Math.PI / 2;

// Maze generation using Recursive Backtracking
function generateMaze(size) {
    const maze = Array.from({ length: size }, () => Array(size).fill(1));

    // Ensure the outer walls are set
    for (let i = 0; i < size; i++) {
        maze[0][i] = 1;
        maze[size - 1][i] = 1;
        maze[i][0] = 1;
        maze[i][size - 1] = 1;
    }

    const directions = [
        [0, 2], [0, -2], [2, 0], [-2, 0]
    ];

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function carve(x, y) {
        maze[y][x] = 0;
        shuffle(directions);
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny > 0 && ny < size - 1 && nx > 0 && nx < size - 1 && maze[ny][nx] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    }

    carve(1, 1);
    return maze;
}

// Function to add maze to the scene
function addMazeToScene(maze, size, level) {
    const floorGeometry = new THREE.PlaneGeometry(size, size);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.x = -0.5;
    floor.position.y = level;
    floor.position.z = -0.5;
    scene.add(floor);

    let wallDrawingDelay = 50; // 500ms delay between walls
    let wallsToDraw = [];
    
    // First collect all wall positions
    maze.forEach((row, z) => {
        row.forEach((cell, x) => {
            if (cell === 1) {
                wallsToDraw.push({
                    x: x - size / 2,
                    z: z - size / 2,
                    level: level
                });
            }
        });
    });

    // Function to draw a single wall
    function drawWall(wallData) {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(wallData.x, 0.5 + wallData.level, wallData.z);
        scene.add(wall);
        wallPositions.push(new THREE.Vector3(wallData.x, 0.5 + wallData.level, wallData.z));
    }

    // Draw walls with delay
    wallsToDraw.forEach((wallData, index) => {
        setTimeout(() => {
            drawWall(wallData);
        }, index * wallDrawingDelay);
    });
}

// Function to find a random finish point
function findFinishPoint(maze) {
    let finishX, finishZ;
    do {
        finishX = Math.floor(Math.random() * (mazeSize - 2)) + 1;
        finishZ = Math.floor(Math.random() * (mazeSize - 2)) + 1;
    } while (maze[finishZ][finishX] !== 0 || (finishX === 1 && finishZ === 1));
    return { x: finishX, z: finishZ };
}

// Function to check collision
function checkCollision(newPosition) {
    for (let wallPos of wallPositions) {
        if (newPosition.distanceTo(wallPos) < 0.8) { // Adjust the threshold as needed
            return true;
        }
    }
    return false;
}

// Function to check if player reached the finish
function checkFinish(newPosition) {
    const finishPos = new THREE.Vector3(
        finishPoint.x - mazeSize / 2,
        0.5 + currentLevel, // Adjust for the current level
        finishPoint.z - mazeSize / 2
    );
    return newPosition.distanceTo(finishPos) < 0.5;
}

function toggleCameraMode(useOverviewMode) {
    if ((useOverviewMode === null) || (useOverviewMode != overviewMode)) {
        overviewMode = !overviewMode;
    } else {
        return;
    }
    orbitControls.enabled = overviewMode;
    if (overviewMode) {
        // Switch to overview POV
        const cameraOffset = new THREE.Vector3(0, 15, 0);
        const height = currentLevel + mazeSize; // Increased height for better overview
        camera.position.set(0, height, 0);
        camera.lookAt(player.position);
        orbitControls.update();
    } else {
        updateFPOVCamera();
        // // Return to first-person POV
        // const cameraOffset = new THREE.Vector3(0, 0.5, 0.5);
        // cameraOffset.applyQuaternion(player.quaternion);
        // camera.position.copy(player.position).add(cameraOffset);
        // // Adjust camera height for a slightly upward view

        // // Calculate look direction based on player rotation
        // const lookDirection = new THREE.Vector3(0, 0, 0);
        // lookDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        // const lookTarget = player.position.clone().add(lookDirection);
        // camera.lookAt(lookTarget);
    }
}

function updateFPOVCamera() {
     // Update camera position to follow the player
     const cameraOffset = new THREE.Vector3(0, 0.5, 0);
     cameraOffset.applyQuaternion(player.quaternion);
     camera.position.copy(player.position).add(cameraOffset);

     // Calculate look direction based on player rotation
     const lookTarget = new THREE.Vector3(
         player.position.x + Math.sin(player.rotation.y),
         player.position.y,
         player.position.z + Math.cos(player.rotation.y)
     );
     camera.lookAt(lookTarget);
}

// Set up initial maze
let mazeSize = 9;
let currentLevel = 0;
let maze = generateMaze(mazeSize);
// Add player
player.position.set(-mazeSize / 2 + 1, 0.5, -mazeSize / 2 + 1);
scene.add(player);

// Set initial camera position and orientation
camera.position.set(player.position.x, player.position.y + 0.5, player.position.z);
// Start in overview mode
toggleCameraMode(true);

// Add initial maze to the scene
addMazeToScene(maze, mazeSize, currentLevel);

// Add finish point
let finishPoint = findFinishPoint(maze);
finish.position.set(finishPoint.x - mazeSize / 2, 0.01 + currentLevel, finishPoint.z - mazeSize / 2);
scene.add(finish);

// Set initial camera position and orientation
//camera.position.set(player.position.x, player.position.y + 0.5, player.position.z);

// Handle player movement
document.addEventListener('keydown', (event) => {
    const keyName = event.key;
    console.log(`Key pressed: ${keyName}`); // Debugging line
    const moveDistance = 0.1;
    let newPosition = player.position.clone();

    switch (keyName) {
        case 'ArrowUp':
            toggleCameraMode(false);
            newPosition.z += moveDistance * Math.cos(player.rotation.y);
            newPosition.x += moveDistance * Math.sin(player.rotation.y);
            break;
        case 'ArrowDown':
            toggleCameraMode(false);
            newPosition.z -= moveDistance * Math.cos(player.rotation.y);
            newPosition.x -= moveDistance * Math.sin(player.rotation.y);
            break;
        case 'ArrowLeft':
            toggleCameraMode(false);
            player.rotation.y += 0.1;
            break;
        case 'ArrowRight':
            toggleCameraMode(false);
            player.rotation.y -= 0.1;
            break;
        case 'q':
            toggleCameraMode(null);
            break;
    }

    if (!overviewMode && !checkCollision(newPosition)) {
        player.position.copy(newPosition);
        updateFPOVCamera();
    }

    if (!overviewMode && checkFinish(newPosition)) {
        
        currentLevel += 1.01;
        // Start animation to move player up
        const startY = player.position.y;
        const targetY = 0.5 + currentLevel;
        const duration = 3000; // 1 second
        const startTime = Date.now();

        function animatePlayerUp() {
            toggleCameraMode(true);
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease the movement using sine
            const easeProgress = Math.sin(progress * Math.PI / 2);
            
            player.position.y = startY + (targetY - startY) * easeProgress;
            player.position.x = -mazeSize / 2 + 1;
            player.position.z = -mazeSize / 2 + 1;

            if (progress < 1) {
                requestAnimationFrame(animatePlayerUp);
            }
        }

        // Generate a new maze above the current one
        toggleCameraMode(true);
        mazeSize += 2;
        maze = generateMaze(mazeSize);
        wallPositions = []; // Reset wall positions
        addMazeToScene(maze, mazeSize, currentLevel);
        // Create a new finish point
        finishPoint = findFinishPoint(maze);
        finish.position.set(finishPoint.x - mazeSize / 2, 0.01 + currentLevel, finishPoint.z - mazeSize / 2);
        // // Update camera position for the new level
        // camera.position.set(player.position.x, player.position.y + 0.5, player.position.z);
        // camera.lookAt(player.position.x, player.position.y, player.position.z - 1);
        // Move player to the new level
        animatePlayerUp();

       
    }
});

// On mobile, use double tap to toggle view.
let lastTap = 0;
document.addEventListener('touchend', (event) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
        toggleCameraMode(null);
    }
    lastTap = currentTime;
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    if (orbitControls.enabled) {
        orbitControls.update();
    }
    renderer.render(scene, camera);
}
animate(); 
