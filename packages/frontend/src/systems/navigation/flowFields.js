import * as THREE from 'three';

// Reusable scratch vectors
const _flowForce = new THREE.Vector3();
const _doorDir = new THREE.Vector3();

/**
 * Konfigurasi Zona Doorway (Kusen Pintu) & Koridor Sempit di PANDEKODE HQ
 */
export const DOORWAYS = [
  // 1. Pintu Masuk Staff Room Kiri / Barat (Pintu Z=0, X=-5)
  {
    id: 'DOOR_STAFF_WEST',
    center: { x: -5.0, z: 0.0 },
    bounds: { minX: -5.9, maxX: -4.1, minZ: -1.6, maxZ: 1.6 },
    axis: 'Z', // Sumbu tegak lurus pintu (arah lewat)
    doorWidth: 1.6
  },
  // 2. Pintu Masuk Staff Room Kanan / Timur (Pintu Z=0, X=5.8)
  {
    id: 'DOOR_STAFF_EAST',
    center: { x: 5.8, z: 0.0 },
    bounds: { minX: 4.9, maxX: 6.7, minZ: -1.6, maxZ: 1.6 },
    axis: 'Z',
    doorWidth: 1.6
  },
  // 3. Pintu Ruang Meeting (Tembok X=-6, Z=-4)
  {
    id: 'DOOR_MEETING',
    center: { x: -6.0, z: -4.0 },
    bounds: { minX: -7.5, maxX: -4.5, minZ: -4.9, maxZ: -3.1 },
    axis: 'X',
    doorWidth: 1.6
  },
  // 4. Pintu Pantry / Lounge (Tembok X=-6, Z=2)
  {
    id: 'DOOR_PANTRY',
    center: { x: -6.0, z: 2.0 },
    bounds: { minX: -7.5, maxX: -4.5, minZ: 1.1, maxZ: 2.9 },
    axis: 'X',
    doorWidth: 1.6
  },
  // 5. Pintu Ruang CEO (Tembok X=7, Z=-2)
  {
    id: 'DOOR_CEO',
    center: { x: 7.0, z: -2.0 },
    bounds: { minX: 5.5, maxX: 8.5, minZ: -2.9, maxZ: -1.1 },
    axis: 'X',
    doorWidth: 1.6
  },
  // 6. Pintu Masuk Utama Kantor / Teras Depan (Tembok Z=9, X=11)
  {
    id: 'DOOR_MAIN_ENTRANCE',
    center: { x: 11.0, z: 9.0 },
    bounds: { minX: 9.7, maxX: 12.3, minZ: 7.5, maxZ: 10.5 },
    axis: 'Z',
    doorWidth: 2.4
  },
  // 7. Pintu Toilet Barat (X = -4, Z = 5)
  {
    id: 'DOOR_TOILET_WEST',
    center: { x: -4.0, z: 5.0 },
    bounds: { minX: -4.7, maxX: -3.3, minZ: 4.1, maxZ: 5.9 },
    axis: 'Z',
    doorWidth: 1.2
  },
  // 8. Pintu Toilet Tengah (X = 1, Z = 5)
  {
    id: 'DOOR_TOILET_MID',
    center: { x: 1.0, z: 5.0 },
    bounds: { minX: 0.3, maxX: 1.7, minZ: 4.1, maxZ: 5.9 },
    axis: 'Z',
    doorWidth: 1.2
  },
  // 9. Pintu Toilet Timur (X = 6, Z = 5)
  {
    id: 'DOOR_TOILET_EAST',
    center: { x: 6.0, z: 5.0 },
    bounds: { minX: 5.3, maxX: 6.7, minZ: 4.1, maxZ: 5.9 },
    axis: 'Z',
    doorWidth: 1.2
  }
];

export const CORRIDORS = [
  // Koridor Utama Tengah (menghubungkan Staff Room, Toilet, Pantry, dan Lobby)
  {
    id: 'CORRIDOR_CENTRAL',
    bounds: { minX: -5.8, maxX: 6.8, minZ: 0.8, maxZ: 4.2 },
    eastboundLaneZ: 3.1, // Jalur pejalan kaki ke arah Timur (+X) berada di sisi Selatan
    westboundLaneZ: 1.9  // Jalur pejalan kaki ke arah Barat (-X) berada di sisi Utara
  }
];

/**
 * Menghitung gaya vektor Flow Field untuk NPC saat berada di sekitar pintu atau koridor.
 * 
 * Mekanisme:
 * 1. Funneling: Menarik posisi NPC ke garis tengah bukaan pintu agar tidak tersangkut di kusen.
 * 2. Perpendicular Through-flow: Memaksa vektor gerak tegak lurus terhadap dinding pintu.
 * 3. Two-Way Lane Separation: Membagi arus lalu lintas berlawanan ke sisi kiri/kanan.
 * 4. Yielding / Anti-deadlock: Jika ada NPC lain yang sedang melintas berlawanan di dalam bukaan sempit,
 *    NPC yang baru mendekat akan memperlambat laju atau memberi ruang jalan.
 */
export function getFlowFieldForce({
  npcId,
  currentPos,
  currentVel,
  targetPos,
  allPositionsRef,
  maxSpeed = 3.0
}) {
  _flowForce.set(0, 0, 0);

  // 1. CEK APAKAH NPC BERADA DI DALAM ZONA DOORWAY
  for (const door of DOORWAYS) {
    const b = door.bounds;
    if (
      currentPos.x >= b.minX && currentPos.x <= b.maxX &&
      currentPos.z >= b.minZ && currentPos.z <= b.maxZ
    ) {
      // Tentukan arah maksud gerak NPC terhadap pintu
      const toTargetX = targetPos.x - currentPos.x;
      const toTargetZ = targetPos.z - currentPos.z;

      if (door.axis === 'Z') {
        // Pintu dengan dinding horizontal (aliran gerak utara-selatan di sumbu Z)
        const primaryDirZ = toTargetZ >= 0 ? 1 : -1;
        
        // 1a. Tarik lateral ke garis tengah pintu
        const lateralDistX = door.center.x - currentPos.x;
        // Berikan offset lajur kanan (~0.2m) jika ada traffic berlawanan
        const laneOffsetX = primaryDirZ > 0 ? 0.2 : -0.2;
        const targetCenterX = door.center.x + laneOffsetX;
        const centeringForceX = (targetCenterX - currentPos.x) * 2.5;

        // 1b. Cek apakah ada NPC lain di dalam doorway dari arah berlawanan (Yielding)
        let isBlockedByOpposite = false;
        if (allPositionsRef && allPositionsRef.current) {
          for (const [otherId, pos] of Object.entries(allPositionsRef.current)) {
            if (otherId === npcId || !pos) continue;
            // Jika NPC lain berada di tengah doorway
            if (
              pos[0] >= b.minX && pos[0] <= b.maxX &&
              pos[2] >= b.minZ && pos[2] <= b.maxZ
            ) {
              // Jika NPC lain berada tepat di depan kita di jalur kita
              const relZ = (pos[2] - currentPos.z) * primaryDirZ;
              if (relZ > 0 && relZ < 1.2) {
                isBlockedByOpposite = true;
                break;
              }
            }
          }
        }

        const forwardSpeed = isBlockedByOpposite ? maxSpeed * 0.35 : maxSpeed;
        _flowForce.set(centeringForceX, 0, primaryDirZ * forwardSpeed);
        return _flowForce;
      } 
      else if (door.axis === 'X') {
        // Pintu dengan dinding vertikal (aliran gerak barat-timur di sumbu X)
        const primaryDirX = toTargetX >= 0 ? 1 : -1;

        // Tarik lateral ke garis tengah pintu di sumbu Z
        const laneOffsetZ = primaryDirX > 0 ? 0.2 : -0.2;
        const targetCenterZ = door.center.z + laneOffsetZ;
        const centeringForceZ = (targetCenterZ - currentPos.z) * 2.5;

        let isBlockedByOpposite = false;
        if (allPositionsRef && allPositionsRef.current) {
          for (const [otherId, pos] of Object.entries(allPositionsRef.current)) {
            if (otherId === npcId || !pos) continue;
            if (
              pos[0] >= b.minX && pos[0] <= b.maxX &&
              pos[2] >= b.minZ && pos[2] <= b.maxZ
            ) {
              const relX = (pos[0] - currentPos.x) * primaryDirX;
              if (relX > 0 && relX < 1.2) {
                isBlockedByOpposite = true;
                break;
              }
            }
          }
        }

        const forwardSpeed = isBlockedByOpposite ? maxSpeed * 0.35 : maxSpeed;
        _flowForce.set(primaryDirX * forwardSpeed, 0, centeringForceZ);
        return _flowForce;
      }
    }
  }

  // 2. CEK APAKAH NPC BERADA DI DALAM KORIDOR SEMPIT (LANE SEPARATION)
  for (const corr of CORRIDORS) {
    const b = corr.bounds;
    if (
      currentPos.x >= b.minX && currentPos.x <= b.maxX &&
      currentPos.z >= b.minZ && currentPos.z <= b.maxZ
    ) {
      const headingX = targetPos.x - currentPos.x;
      // Jika bergerak cukup signifikan di sumbu X
      if (Math.abs(headingX) > 0.5) {
        const isEastbound = headingX > 0;
        const targetLaneZ = isEastbound ? corr.eastboundLaneZ : corr.westboundLaneZ;
        const lanePullZ = (targetLaneZ - currentPos.z) * 1.5;

        _flowForce.set((isEastbound ? 1 : -1) * maxSpeed * 0.5, 0, lanePullZ);
        return _flowForce;
      }
    }
  }

  return _flowForce;
}
