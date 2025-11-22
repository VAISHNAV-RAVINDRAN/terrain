Babylon Infinite Terrain (Minimal)

What this is
- A small static Babylon.js demo that creates a chunked procedural terrain using Perlin noise.
- An FPS-like camera (pointer lock) with WASD movement and jumping.
- Chunks are generated in a 3x3 grid around the player and recycled to simulate "infinite" terrain.

Files
- `index.html` - entry page, loads Babylon.js and `app.js`.
- `app.js` - scene and logic for terrain and camera.

Run locally
- Easiest: open `index.html` in a browser. For pointer lock and some browser security policies, use a local server.

Using Python (if available):
```cmd
py -m http.server 8080
```
Open `http://localhost:8080` in a browser.

Using npx http-server (Node installed):
```cmd
npx http-server . -p 8080
```

Controls
- Click canvas to lock pointer and enable mouse look.
- WASD to move, Space to jump.

Notes & next steps
- This is a minimal example; it uses a simple Perlin implementation and CPU-side vertex displacement.
- Improvements: better LOD, GPU displacement, textures, vegetation, skybox/sky material, physics integration.

If you want, I can:
- Add a skybox texture and sun movement.
- Add simple vegetation (billboards) or rocks placed by noise.
- Integrate a nicer material/texture blending for slopes and flat areas.
"# terrain" 
