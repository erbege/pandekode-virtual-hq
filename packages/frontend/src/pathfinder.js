import PF from 'pathfinding';

/**
 * Pathfinding Grid System (A* Algorithm)
 * - Resolusi: 4 cells per meter (0.25m per grid cell)
 * - Obstacle padding: 0.32m (memberi clearance aman melebihi CapsuleCollider radius 0.25m)
 * - Line-of-Sight Raycast Smoothing: Menghilangkan gerak tangga diagonal menjadi lintasan lurus alami
 */

// Batas area kantor dan teras luar
const MIN_X = -15;
const MAX_X = 15;
const MIN_Z = -12;
const MAX_Z = 12;

// Resolusi: 4 cell per meter (0.25m per grid cell)
export const RESOLUTION = 4;
export const STEP = 1 / RESOLUTION; // 0.25m

const width = (MAX_X - MIN_X) * RESOLUTION;   // 120
const height = (MAX_Z - MIN_Z) * RESOLUTION; // 96

// Radius padding keamanan NPC (CapsuleCollider radius = 0.25m, padding 0.32m menjamin bebas kontak fisik)
export const RADIUS = 0.32;

// Daftar seluruh rintangan fisik statis (Dinding, Meja Kerja, Sofa, Counter, Toilet)
export const obstacles = [
  // --- Dinding Eksterior ---
  { x: 0, z: -12, w: 30, d: 0.4 },            // Dinding Belakang
  { x: -2.5, z: 9, w: 25, d: 0.4 },          // Dinding Depan Kiri
  { x: 13.5, z: 9, w: 3, d: 0.4 },           // Dinding Depan Kanan (Celah pintu masuk di X = 10 s/d 12)
  { x: -15, z: -1.5, w: 0.4, d: 21 },        // Dinding Luar Kiri
  { x: 15, z: -1.5, w: 0.4, d: 21 },         // Dinding Luar Kanan

  // --- Dinding Horisontal Interior (Z = 0) ---
  { x: -10.5, z: 0, w: 9, d: 0.4 },          // Pemisah Meeting Room vs Pantry
  { x: 0.5, z: 0, w: 9, d: 0.4 },            // Dinding Staff Room (Pintu Kiri X = -5, Pintu Kanan X = 5.8)
  { x: 10.9, z: 0, w: 8.2, d: 0.4 },         // Pemisah CEO Room vs Lobby

  // --- Dinding Vertikal Interior (X = -6) ---
  { x: -6, z: -8.5, w: 0.4, d: 7 },          // Tembok Meeting utara
  { x: -6, z: -1.5, w: 0.4, d: 3 },          // Tembok Meeting selatan (Pintu Meeting di Z = -4)
  { x: -6, z: 0.5, w: 0.4, d: 1 },           // Tembok Pantry utara (Pintu Pantry di Z = 2)
  { x: -6, z: 6, w: 0.4, d: 6 },             // Tembok Pantry selatan

  // --- Dinding Vertikal Interior (X = 7) ---
  { x: 7, z: -7.5, w: 0.4, d: 9 },           // Tembok CEO utara (Pintu CEO di Z = -2)
  { x: 7, z: -0.4, w: 0.4, d: 1.2 },         // Tembok CEO selatan
  { x: 7, z: 7, w: 0.4, d: 4 },              // Tembok Restroom vs Lobby

  // --- Dinding Horisontal Toilet (Z = 5) ---
  { x: -5.35, z: 5, w: 1.3, d: 0.4 },
  { x: -1.5, z: 5, w: 3.6, d: 0.4 },
  { x: 2.35, z: 5, w: 1.3, d: 0.4 },
  { x: 4.15, z: 5, w: 2.3, d: 0.4 },
  { x: 6.85, z: 5, w: 0.3, d: 0.4 },

  // Dinding Vertikal Pembagi Toilet (Z = 7)
  { x: -1.5, z: 7, w: 0.4, d: 4 },
  { x: 3, z: 7, w: 0.4, d: 4 },

  // Bilik Toilet (Cubicles) - Berada di dekat dinding selatan (Z = 8.2, kedalaman 0.9m sesuai collider Rapier)
  { x: -3.75, z: 8.2, w: 0.8, d: 0.9 },
  { x: 0.75, z: 8.2, w: 0.8, d: 0.9 },
  { x: 5, z: 8.2, w: 0.8, d: 0.9 },

  // --- Meja Kerja Staff Room (DeskWithLaptop) ---
  { x: -4, z: -9, w: 3.0, d: 1.5 },
  { x: 0.5, z: -9, w: 3.0, d: 1.5 },
  { x: 5, z: -9, w: 3.0, d: 1.5 },
  { x: -4, z: -5, w: 3.0, d: 1.5 },
  { x: 0.5, z: -5, w: 3.0, d: 1.5 },
  { x: 5, z: -5, w: 3.0, d: 1.5 },

  // --- Meja CEO & Sofa Set Lounge ---
  { x: 11, z: -9, w: 3.0, d: 1.5 },
  { x: 12.9, z: -4.2, w: 2.6, d: 3.8 },       // Sofa Set CEO (Lounge Tamu VIP)

  // --- Ruang Meeting ---
  { x: -10.5, z: -6, w: 4.0, d: 6.0 },       // Meja Meeting Besar
  { x: -14, z: -6, w: 0.4, d: 4.0 },         // Papan Kanban

  // --- Pantry & Lounge ---
  { x: -10.5, z: 8, w: 4.2, d: 1.7 },        // Counter Pantry
  { x: -13.8, z: 8.0, w: 1.1, d: 1.0 },       // Kulkas Pantry
  { x: -10.5, z: 2, w: 3.0, d: 1.2 },        // Sofa 1
  { x: -10.5, z: 5, w: 3.0, d: 1.2 },        // Sofa 2

  // --- Lobby ---
  { x: 11, z: 2, w: 4.0, d: 1.0 },           // Meja Resepsionis
  { x: 12.9, z: 5.8, w: 2.6, d: 2.8 }        // Sofa Set Tamu Lobi
];

/**
 * Membangun Grid A* 2D dengan padding obstacle 0.32m
 */
function buildPathfindingGrid() {
  const g = new PF.Grid(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wx = (x / RESOLUTION) + MIN_X;
      const wz = (y / RESOLUTION) + MIN_Z;

      // Batasan batas gedung & teras luar
      if (wz > 8.8 && (wx < 8.5 || wx > 14.5)) {
        g.setWalkableAt(x, y, false);
        continue;
      }
      if (wx < -14.6 || wx > 14.6 || wz < -11.6 || wz > 12.5) {
        g.setWalkableAt(x, y, false);
        continue;
      }

      let walkable = true;
      for (const obs of obstacles) {
        const halfW = (obs.w / 2) + RADIUS;
        const halfD = (obs.d / 2) + RADIUS;
        if (Math.abs(wx - obs.x) <= halfW && Math.abs(wz - obs.z) <= halfD) {
          walkable = false;
          break;
        }
      }

      if (!walkable) {
        g.setWalkableAt(x, y, false);
      }
    }
  }

  return g;
}

export const navigationGrid = buildPathfindingGrid();

const astarFinder = new PF.AStarFinder({
  allowDiagonal: true,
  dontCrossCorners: true
});

/**
 * Mencari sel terdekat pada grid yang benar-benar bisa dilewati (walkable).
 */
export function findNearestWalkable(gx, gy, searchGrid = navigationGrid, maxRadius = 16) {
  if (gx >= 0 && gx < width && gy >= 0 && gy < height && searchGrid.isWalkableAt(gx, gy)) {
    return [gx, gy];
  }

  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (searchGrid.isWalkableAt(nx, ny)) {
            return [nx, ny];
          }
        }
      }
    }
  }
  return [gx, gy];
}

/**
 * Cek apakah koordinat dunia (wx, wz) dapat dilewati NPC.
 */
export function isPointWalkable(wx, wz) {
  const gx = Math.round((wx - MIN_X) * RESOLUTION);
  const gy = Math.round((wz - MIN_Z) * RESOLUTION);
  if (gx < 0 || gx >= width || gy < 0 || gy >= height) return false;
  return navigationGrid.isWalkableAt(gx, gy);
}

/**
 * Mendapatkan posisi dunia (world position) terdekat yang bebas rintangan pada Grid A*.
 */
export function getNearestWalkableWorld(wx, wz) {
  const gx = Math.round((wx - MIN_X) * RESOLUTION);
  const gy = Math.round((wz - MIN_Z) * RESOLUTION);
  const [safeGx, safeGy] = findNearestWalkable(gx, gy, navigationGrid);
  return {
    x: (safeGx / RESOLUTION) + MIN_X,
    z: (safeGy / RESOLUTION) + MIN_Z
  };
}

/**
 * Menyederhanakan rute dengan menghapus waypoint collinear pada segmen lurus.
 * Mempertahankan waypoint belokan aman dan koridor clearance tanpa memotong sudut furnitur.
 */
function simplifyPath(path) {
  if (path.length <= 2) return path;
  
  const result = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = path[i];
    const next = path[i + 1];
    
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    
    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push(curr);
    }
  }
  
  result.push(path[path.length - 1]);
  return result;
}

/**
 * Menghitung rute navigasi A* dari startPos ke endPos.
 * Selalu menjamin titik awal dan tujuan berada pada area aman bebas rintangan.
 * 
 * @param {Object|Array} startPos - Koordinat awal {x, y, z} atau [x, y, z]
 * @param {Object|Array} endPos - Koordinat tujuan {x, y, z} atau [x, y, z]
 * @returns {Array<Object>} Daftar waypoint [{ x, y, z }]
 */
export function getPath(startPos, endPos) {
  if (!endPos) return [];

  const startX = startPos.x !== undefined ? startPos.x : startPos[0];
  const startY = startPos.y !== undefined ? startPos.y : 0;
  const startZ = startPos.z !== undefined ? startPos.z : startPos[2];

  const endX = endPos.x !== undefined ? endPos.x : endPos[0];
  const endY = endPos.y !== undefined ? endPos.y : startY;
  const endZ = endPos.z !== undefined ? endPos.z : endPos[2];

  let gx1 = Math.round((startX - MIN_X) * RESOLUTION);
  let gy1 = Math.round((startZ - MIN_Z) * RESOLUTION);
  let gx2 = Math.round((endX - MIN_X) * RESOLUTION);
  let gy2 = Math.round((endZ - MIN_Z) * RESOLUTION);
  
  // Bounds clamp
  gx1 = Math.max(0, Math.min(width - 1, gx1));
  gy1 = Math.max(0, Math.min(height - 1, gy1));
  gx2 = Math.max(0, Math.min(width - 1, gx2));
  gy2 = Math.max(0, Math.min(height - 1, gy2));

  // Pastikan titik start dan end berada di sel yang walkable (di luar obyek)
  const [safeStartX, safeStartY] = findNearestWalkable(gx1, gy1, navigationGrid);
  const [safeEndX, safeEndY] = findNearestWalkable(gx2, gy2, navigationGrid);

  // Jika start dan end berada di sel yang sama, langsung selesai
  if (safeStartX === safeEndX && safeStartY === safeEndY) {
    return [
      {
        x: (safeEndX / RESOLUTION) + MIN_X,
        y: startY,
        z: (safeEndY / RESOLUTION) + MIN_Z
      }
    ];
  }
  
  const gridClone = navigationGrid.clone();
  
  // Izinkan start dan end aman agar pencarian A* tidak terhambat toleransi grid
  gridClone.setWalkableAt(safeStartX, safeStartY, true);
  gridClone.setWalkableAt(safeEndX, safeEndY, true);
  
  const path = astarFinder.findPath(safeStartX, safeStartY, safeEndX, safeEndY, gridClone);
  if (!path || path.length === 0) return [];
  
  const simplified = simplifyPath(path);
  
  return simplified.map(([gx, gy]) => ({
    x: (gx / RESOLUTION) + MIN_X,
    y: startY,
    z: (gy / RESOLUTION) + MIN_Z
  }));
}
