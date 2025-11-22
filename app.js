(function(){
  const canvas = document.getElementById('renderCanvas');
  const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:true});
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.53, 0.81, 0.92); // sky blue
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
  scene.fogDensity = 0.0015;
  scene.fogColor = scene.clearColor;

  // Light
  const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.3, -1, 0.1), scene);
  sun.intensity = 1.0;
  const hemi = new BABYLON.HemisphericLight('hem', new BABYLON.Vector3(0,1,0), scene);
  hemi.intensity = 0.5;

  // Basic materials
  const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.36, 0.28, 0.18);
  groundMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);

  // Camera: FPS-style
  const camera = new BABYLON.UniversalCamera('fpsCam', new BABYLON.Vector3(0, 3, 0), scene);
  camera.attachControl(canvas, true);
  camera.speed = 0.5;
  camera.angularSensibility = 5000; // pointer sensitivity
  camera.applyGravity = true;
  camera.ellipsoid = new BABYLON.Vector3(0.5, 1.0, 0.5);
  camera.checkCollisions = true;

  scene.collisionsEnabled = true;

  // Enable pointer lock on click
  canvas.addEventListener('click', function(){
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
      if (canvas.requestPointerLock) { canvas.requestPointerLock(); }
    }
  });

  // Simple Perlin noise implementation (improved noise)
  // Source: Stefan Gustavson's Java implementation adapted to JS (small, permissive)
  const Perlin = (function(){
    const p = new Uint8Array(512);
    const permutation = [151,160,137,91,90,15,
      131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
      190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
      88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
      77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
      102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
      135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,
      202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,
      183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
      129,22,39,253, 19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,
      34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,
      214,31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,138,236,205,
      93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    for (let i=0;i<256;i++){ p[256+i]=p[i]=permutation[i]; }

    function fade(t){ return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t,a,b){ return a + t * (b - a); }
    function grad(hash, x, y, z){
      const h = hash & 15;
      const u = h<8 ? x : y;
      const v = h<4 ? y : (h===12||h===14 ? x : z);
      return ((h&1)===0 ? u : -u) + ((h&2)===0 ? v : -v);
    }
    return {
      noise: function(x,y,z){
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = fade(x), v = fade(y), w = fade(z);
        const A  = p[X  ]+Y, AA = p[A]+Z, AB = p[A+1]+Z;
        const B  = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
        return lerp(w, lerp(v, lerp(u, grad(p[AA  ], x  , y  , z   ),
                                     grad(p[BA  ], x-1, y  , z   )),
                             lerp(u, grad(p[AB  ], x  , y-1, z   ),
                                     grad(p[BB  ], x-1, y-1, z   ))),
                       lerp(v, lerp(u, grad(p[AA+1], x  , y  , z-1 ),
                                     grad(p[BA+1], x-1, y  , z-1 )),
                             lerp(u, grad(p[AB+1], x  , y-1, z-1 ),
                                     grad(p[BB+1], x-1, y-1, z-1 ))));
      }
    };
  })();

  // Terrain chunk system
  const CHUNK_RES = 48;           // subdivisions for each chunk (vertices per side = CHUNK_RES+1)
  const CHUNK_SIZE = 60;          // world size per chunk
  const VERTICAL_SCALE = 8;       // height multiplier
  const GRID_RADIUS = 1;          // 1 => 3x3 chunks
  const RENDER_RADIUS = GRID_RADIUS;
  const chunks = new Map();       // key => {mesh, i, j}

  function chunkKey(i,j){ return `${i},${j}`; }

  function makeChunk(i,j){
    const name = `chunk_${i}_${j}`;
    const options = { width: CHUNK_SIZE, height: CHUNK_SIZE, subdivisions: CHUNK_RES };
    const mesh = BABYLON.MeshBuilder.CreateGround(name, options, scene);
    mesh.material = groundMat;
    mesh.receiveShadows = true;
    mesh.checkCollisions = true;
    mesh.isPickable = false;
    // Move chunk to its world position
    const worldX = i * CHUNK_SIZE;
    const worldZ = j * CHUNK_SIZE;
    mesh.position.x = worldX;
    mesh.position.z = worldZ;
    // displace vertices by noise
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    for (let vi=0; vi<positions.length; vi+=3){
      const vx = positions[vi] + worldX - (CHUNK_SIZE/2);
      const vz = positions[vi+2] + worldZ - (CHUNK_SIZE/2);
      const nx = vx * 0.01;
      const nz = vz * 0.01;
      // combine a few octaves
      let h = 0;
      h += 1.0 * Perlin.noise(nx * 0.8, nz * 0.8, 0.1);
      h += 0.5 * Perlin.noise(nx * 2.0, nz * 2.0, 0.2);
      h += 0.25 * Perlin.noise(nx * 4.5, nz * 4.5, 0.3);
      h = h * VERTICAL_SCALE;
      positions[vi+1] = h;
    }
    mesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    mesh.convertToFlatShadedMesh();
    // enable collisions with the camera
    mesh.checkCollisions = true;

    return {mesh, i, j};
  }

  function ensureChunksAround(cx, cz){
    const ci = Math.floor((cx + CHUNK_SIZE/2) / CHUNK_SIZE);
    const cj = Math.floor((cz + CHUNK_SIZE/2) / CHUNK_SIZE);
    const wanted = new Set();
    for (let di=-GRID_RADIUS; di<=GRID_RADIUS; di++){
      for (let dj=-GRID_RADIUS; dj<=GRID_RADIUS; dj++){
        const ii = ci + di; const jj = cj + dj;
        wanted.add(chunkKey(ii,jj));
        if (!chunks.has(chunkKey(ii,jj))){
          const c = makeChunk(ii, jj);
          chunks.set(chunkKey(ii,jj), c);
        }
      }
    }
    // drop any chunks not wanted
    for (const k of Array.from(chunks.keys())){
      if (!wanted.has(k)){
        const c = chunks.get(k);
        c.mesh.dispose();
        chunks.delete(k);
      }
    }
  }

  // Create some visual markers (optional)
  const sphere = BABYLON.MeshBuilder.CreateSphere('marker', {diameter: 1.0}, scene);
  sphere.position.y = 2;
  sphere.position.x = 0;
  sphere.position.z = 10;

  // Basic ground collider: create an invisible big box large enough so camera doesn't fall through when chunks move
  const floorCollider = BABYLON.MeshBuilder.CreateBox('floorCol', {size: 1}, scene);
  floorCollider.isVisible = false;
  floorCollider.checkCollisions = true;
  floorCollider.position.y = -1000; // keep out of the way

  // Jump handling
  let canJump = false;
  scene.onBeforeRenderObservable.add(()=>{
    // We'll approximate: if camera is near terrain (y <= terrain height + small epsilon) allow jump
    // Find nearest chunk under camera
    const camX = camera.position.x;
    const camZ = camera.position.z;
    const ci = Math.floor((camX + CHUNK_SIZE/2) / CHUNK_SIZE);
    const cj = Math.floor((camZ + CHUNK_SIZE/2) / CHUNK_SIZE);
    const k = chunkKey(ci,cj);
    let groundY = -1000;
    if (chunks.has(k)){
      const c = chunks.get(k).mesh;
      // approximate: sample noise again to estimate height
      const nx = camX * 0.01;
      const nz = camZ * 0.01;
      let h = 0;
      h += 1.0 * Perlin.noise(nx * 0.8, nz * 0.8, 0.1);
      h += 0.5 * Perlin.noise(nx * 2.0, nz * 2.0, 0.2);
      h += 0.25 * Perlin.noise(nx * 4.5, nz * 4.5, 0.3);
      h = h * VERTICAL_SCALE;
      groundY = h;
    }
    canJump = camera.position.y <= groundY + 1.01;
  });

  // Keyboard controls: enable jump
  const inputMap = {};
  scene.actionManager = new BABYLON.ActionManager(scene);
  scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function(evt){
    inputMap[evt.sourceEvent.key] = evt.sourceEvent.type === 'keydown';
  }));
  scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function(evt){
    inputMap[evt.sourceEvent.key] = false;
  }));

  // Make camera collisions and gravity work: use scene gravity and camera.applyGravity
  scene.gravity = new BABYLON.Vector3(0, -0.98, 0);
  scene.collisionsEnabled = true;
  camera.checkCollisions = true;
  camera.applyGravity = true;

  // Adjust movement each frame
  scene.onBeforeRenderObservable.add(()=>{
    // WASD movement using local directions
    const forward = new BABYLON.Vector3(0,0,1);
    const right = new BABYLON.Vector3(1,0,0);
    const transform = BABYLON.Matrix.RotationYawPitchRoll(camera.rotation.y, 0, 0);
    const fwdWorld = BABYLON.Vector3.TransformCoordinates(forward, transform).normalize();
    const rightWorld = BABYLON.Vector3.TransformCoordinates(right, transform).normalize();
    let move = new BABYLON.Vector3.Zero();
    if (inputMap['w'] || inputMap['W']) move = move.add(fwdWorld);
    if (inputMap['s'] || inputMap['S']) move = move.subtract(fwdWorld);
    if (inputMap['a'] || inputMap['A']) move = move.subtract(rightWorld);
    if (inputMap['d'] || inputMap['D']) move = move.add(rightWorld);
    move.y = 0;
    if (move.lengthSquared() > 0) {
      move = move.normalize().scale(camera.speed);
      camera.cameraDirection = camera.cameraDirection.add(move);
    }
    // jump
    if ((inputMap[' '] || inputMap['Space']) && canJump){
      camera.cameraDirection.y = 0.4; // upwards impulse
      canJump = false;
    }
    // keep chunks around the camera
    ensureChunksAround(camera.position.x, camera.position.z);
  });

  // Initial chunk population
  ensureChunksAround(0,0);

  // Helper: convert a GitHub "blob" url to the raw.githubusercontent.com url
  function githubToRaw(url){
    if (!url) return url;
    try{
      // common pattern: https://github.com/user/repo/blob/branch/path/to/file.glb
      if (url.indexOf('github.com') !== -1 && url.indexOf('/blob/') !== -1){
        return url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
      }
    }catch(e){ }
    return url;
  }

  // Load a GLB (or glTF) terrain from a public URL (GitHub raw link recommended)
  // Example usage: loadTerrainFromURL('https://raw.githubusercontent.com/USER/REPO/branch/path/to/terrain.glb')
  function loadTerrainFromURL(url){
    if (!url) return Promise.reject(new Error('No URL provided'));
    const raw = githubToRaw(url.trim());
    console.log('Loading terrain from:', raw);
    return new Promise((resolve, reject) => {
      BABYLON.SceneLoader.Append('', raw, scene, function(){
        console.log('Terrain loaded from', raw);
        // Enable collisions for the newly loaded meshes (heuristic)
        scene.meshes.forEach(m => {
          try{
            if (!m.checkCollisions){
              // If mesh seems large or named like terrain, enable collisions
              const name = (m.name || '').toLowerCase();
              if (name.indexOf('terrain') !== -1 || name.indexOf('ground') !== -1 || (m.getTotalVertices && m.getTotalVertices() > 100)){
                m.checkCollisions = true;
              }
            }
          }catch(e){}
        });
        resolve();
      }, function(progressEvent){
        if (progressEvent && progressEvent.lengthComputable){
          const pct = Math.floor(progressEvent.loaded / progressEvent.total * 100);
          // optional: show progress
          // console.log('Load progress:', pct + '%');
        }
      }, function(sceneOrError, message, exception){
        // SceneLoader error callback can provide different signatures depending on loader
        console.error('Failed to load terrain:', message || sceneOrError, exception || '');
        reject(new Error(message || 'Load failed'));
      });
    });
  }

  // Example: place your GitHub raw link here (commented out). Replace with your link or call from console.
  // loadTerrainFromURL('https://raw.githubusercontent.com/USER/REPO/branch/path/to/terrain.glb').catch(console.error);

  // Auto-load the terrain from the GitHub link provided by the user (will be converted to raw URL)
  loadTerrainFromURL('https://github.com/VAISHNAV-RAVINDRAN/terrain/blob/main/death_valley_-_terrain.glb').catch(function(err){
    console.error('Terrain load failed:', err);
  });

  // Simple UI: show pointerlock status
  document.addEventListener('pointerlockchange', function(){
    const locked = document.pointerLockElement === canvas;
    const info = document.getElementById('info');
    info.textContent = locked ? 'Pointer locked. WASD to move. Space=jump. Esc to unlock.' : 'Click to lock pointer. WASD to move. Space=jump.';
  });

  engine.runRenderLoop(function(){
    scene.render();
  });

  window.addEventListener('resize', function(){ engine.resize(); });
})();
