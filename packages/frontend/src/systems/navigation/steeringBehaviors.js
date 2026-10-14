import * as THREE from 'three';

// Scratch vectors untuk eliminasi Garbage Collection (GC) pada 60 FPS
const _desiredVel = new THREE.Vector3();
const _steerForce = new THREE.Vector3();
const _sepForce = new THREE.Vector3();
const _avoidForce = new THREE.Vector3();
const _probePos = new THREE.Vector3();
const _heading = new THREE.Vector3();

// Parameter Default Reynolds Steering Behaviors
export const STEERING_CONFIG = {
  MAX_SPEED: 3.0,
  MAX_FORCE: 16.0,          // Kecepatan adaptasi gaya kemudi (akselerasi maksimum m/s²)
  SLOWING_RADIUS: 1.0,      // Jarak deselerasi mulus saat tiba (Arrive)
  WAYPOINT_RADIUS: 0.36,    // Jarak kuadrat (~0.6m) dianggap mencapai waypoint perantara
  FINAL_WAYPOINT_RADIUS: 0.49, // Jarak kuadrat (~0.7m) titik akhir
  SEPARATION_RADIUS: 0.80,  // Jarak mulai saling menghindar antar-NPC (Flee/Separation)
  SEPARATION_WEIGHT: 1.2,   // Bobot gaya tolak antar kerumunan
  OBSTACLE_WEIGHT: 1.0,     // Bobot gaya hindar rintangan (cushion pendukung rute A*)
  FLOW_WEIGHT: 1.0,         // Bobot gaya dorong flow field pintu/lorong
  SEEK_WEIGHT: 1.0,         // Bobot gaya menuju target waypoint
  WHISKER_LENGTH: 0.65,     // Panjang sensor utama ke depan (proporsional lorong 1.4m)
  WHISKER_SIDE_LENGTH: 0.45,// Panjang kumis sensor serong
  WHISKER_ANGLE: 0.38       // Sudut kumis sensor serong (~22 derajat)
};

/**
 * 1. SEEK BEHAVIOR (Reynolds)
 * Menghitung gaya dorong ke arah target waypoint dengan kecepatan penuh.
 */
export function seek(currentPos, currentVel, targetPos, maxSpeed = STEERING_CONFIG.MAX_SPEED) {
  _desiredVel.subVectors(targetPos, currentPos);
  _desiredVel.y = 0; // Kunci bidang horizontal
  
  const dist = _desiredVel.length();
  if (dist < 0.001) {
    return _steerForce.set(0, 0, 0);
  }

  _desiredVel.multiplyScalar(maxSpeed / dist);
  _steerForce.subVectors(_desiredVel, currentVel);
  _steerForce.y = 0;
  return _steerForce;
}

/**
 * 2. ARRIVE BEHAVIOR (Reynolds)
 * Menghitung gaya dorong menuju target dengan deselerasi mulus (ease-out)
 * saat memasuki radius perlambatan (slowing radius).
 */
export function arrive(currentPos, currentVel, targetPos, maxSpeed = STEERING_CONFIG.MAX_SPEED, slowingRadius = STEERING_CONFIG.SLOWING_RADIUS) {
  _desiredVel.subVectors(targetPos, currentPos);
  _desiredVel.y = 0;

  const dist = _desiredVel.length();
  if (dist < 0.001) {
    return _steerForce.set(0, 0, 0);
  }

  let targetSpeed = maxSpeed;
  if (dist < slowingRadius) {
    targetSpeed = maxSpeed * (dist / slowingRadius);
  }

  _desiredVel.multiplyScalar(targetSpeed / dist);
  _steerForce.subVectors(_desiredVel, currentVel);
  _steerForce.y = 0;
  return _steerForce;
}

/**
 * 3. FLEE / SEPARATION BEHAVIOR (Reynolds)
 * Menghitung gaya tolak dari NPC/karakter lain di sekitarnya.
 * Mengabaikan/mengurangi gaya jika karakter lain sedang duduk di kursinya
 * agar NPC yang lewat di lorong tidak terdorong menabrak dinding.
 */
export function separation(npcId, currentPos, allPositionsRef, separationRadius = STEERING_CONFIG.SEPARATION_RADIUS, isSeatedCheck = null) {
  _sepForce.set(0, 0, 0);
  if (!allPositionsRef || !allPositionsRef.current) return _sepForce;

  const positions = allPositionsRef.current;
  let neighborCount = 0;

  for (const [otherId, pos] of Object.entries(positions)) {
    if (otherId === npcId || !pos) continue;

    // Jika NPC lain sedang duduk di kursi mejanya, gunakan radius minimal (0.4m)
    const isOtherSitting = isSeatedCheck ? isSeatedCheck(otherId, pos) : false;
    const effectiveRadius = isOtherSitting ? 0.40 : separationRadius;

    const dx = currentPos.x - pos[0];
    const dz = currentPos.z - pos[2];
    const distSq = dx * dx + dz * dz;

    if (distSq > 0.0001 && distSq < effectiveRadius * effectiveRadius) {
      const dist = Math.sqrt(distSq);
      const strength = (effectiveRadius - dist) / dist;
      _sepForce.x += (dx / dist) * strength;
      _sepForce.z += (dz / dist) * strength;
      neighborCount++;
    }
  }

  if (neighborCount > 0) {
    _sepForce.x /= neighborCount;
    _sepForce.z /= neighborCount;
    _sepForce.y = 0;
  }

  return _sepForce;
}

/**
 * 4. OBSTACLE AVOIDANCE BEHAVIOR (Reynolds Whiskers)
 * Menggunakan kumis sensor ke depan untuk mendeteksi dinding/perabot.
 * Mematikan gaya tolak pada meja yang ditargetkan atau meja tempat NPC baru saja bangun,
 * sehingga NPC tidak nyangkut atau mental saat mendekati atau meninggalkan kursi kerjanya.
 */
export function obstacleAvoidance(
  currentPos,
  currentVel,
  obstacles,
  maxSpeed = STEERING_CONFIG.MAX_SPEED,
  targetPos = null,
  assignedDesk = null
) {
  _avoidForce.set(0, 0, 0);
  if (!obstacles || obstacles.length === 0) return _avoidForce;

  const speed = currentVel.length();
  if (speed < 0.05) {
    _heading.set(0, 0, 0);
    return _avoidForce;
  }
  _heading.copy(currentVel).multiplyScalar(1 / speed);

  const angle = STEERING_CONFIG.WHISKER_ANGLE;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const whiskers = [
    {
      dir: _heading,
      len: STEERING_CONFIG.WHISKER_LENGTH
    },
    {
      dir: new THREE.Vector3(
        _heading.x * cosA - _heading.z * sinA,
        0,
        _heading.x * sinA + _heading.z * cosA
      ),
      len: STEERING_CONFIG.WHISKER_SIDE_LENGTH
    },
    {
      dir: new THREE.Vector3(
        _heading.x * cosA + _heading.z * sinA,
        0,
        -_heading.x * sinA + _heading.z * cosA
      ),
      len: STEERING_CONFIG.WHISKER_SIDE_LENGTH
    }
  ];

  let closestHitDist = Infinity;
  let bestPushX = 0;
  let bestPushZ = 0;

  for (const w of whiskers) {
    _probePos.copy(currentPos).addScaledVector(w.dir, w.len);

    for (const obs of obstacles) {
      // 1. Abaikan rintangan jika target tujuan berada tepat di perabot tersebut (misal kursi meja kerja / meeting)
      if (targetPos) {
        const dxTarget = Math.max(0, Math.abs(targetPos.x - obs.x) - obs.w / 2);
        const dzTarget = Math.max(0, Math.abs(targetPos.z - obs.z) - obs.d / 2);
        if (Math.hypot(dxTarget, dzTarget) < 1.4) continue;
      }

      // 2. Abaikan rintangan jika NPC sedang berdiri/beranjak dari meja kerjanya sendiri
      if (assignedDesk) {
        const dxDesk = Math.max(0, Math.abs(assignedDesk[0] - obs.x) - obs.w / 2);
        const dzDesk = Math.max(0, Math.abs(assignedDesk[2] - obs.z) - obs.d / 2);
        if (Math.hypot(dxDesk, dzDesk) < 1.4) {
          const dxCurr = Math.max(0, Math.abs(currentPos.x - obs.x) - obs.w / 2);
          const dzCurr = Math.max(0, Math.abs(currentPos.z - obs.z) - obs.d / 2);
          if (Math.hypot(dxCurr, dzCurr) < 1.4) continue;
        }
      }

      const halfW = obs.w / 2 + 0.26;
      const halfD = obs.d / 2 + 0.26;

      const isInside = (
        Math.abs(_probePos.x - obs.x) <= halfW &&
        Math.abs(_probePos.z - obs.z) <= halfD
      );

      if (isInside) {
        const distToCenter = Math.hypot(currentPos.x - obs.x, currentPos.z - obs.z);
        if (distToCenter < closestHitDist) {
          closestHitDist = distToCenter;

          const overlapX = halfW - Math.abs(_probePos.x - obs.x);
          const overlapZ = halfD - Math.abs(_probePos.z - obs.z);

          if (overlapX < overlapZ) {
            bestPushX = _probePos.x > obs.x ? 1 : -1;
            bestPushZ = 0;
          } else {
            bestPushX = 0;
            bestPushZ = _probePos.z > obs.z ? 1 : -1;
          }
        }
      }
    }
  }

  if (closestHitDist < Infinity) {
    _avoidForce.set(bestPushX * maxSpeed, 0, bestPushZ * maxSpeed);
  }

  return _avoidForce;
}

/**
 * Kombinasikan semua gaya kemudi Reynolds menjadi kecepatan pergerakan yang mulus.
 */
export function combineSteering({
  seekForce,
  separationForce,
  obstacleForce,
  flowForce,
  currentVel,
  dt,
  maxSpeed = STEERING_CONFIG.MAX_SPEED,
  maxForce = STEERING_CONFIG.MAX_FORCE
}) {
  const totalForce = new THREE.Vector3();

  if (seekForce) {
    totalForce.addScaledVector(seekForce, STEERING_CONFIG.SEEK_WEIGHT);
  }
  if (separationForce && separationForce.lengthSq() > 0.001) {
    totalForce.addScaledVector(separationForce, STEERING_CONFIG.SEPARATION_WEIGHT);
  }
  if (obstacleForce && obstacleForce.lengthSq() > 0.001) {
    totalForce.addScaledVector(obstacleForce, STEERING_CONFIG.OBSTACLE_WEIGHT);
  }
  if (flowForce && flowForce.lengthSq() > 0.001) {
    totalForce.addScaledVector(flowForce, STEERING_CONFIG.FLOW_WEIGHT);
  }

  const forceMag = totalForce.length();
  if (forceMag > maxForce) {
    totalForce.multiplyScalar(maxForce / forceMag);
  }

  const newVel = currentVel.clone().addScaledVector(totalForce, dt);
  newVel.y = 0;

  const newSpeed = newVel.length();
  if (newSpeed > maxSpeed) {
    newVel.multiplyScalar(maxSpeed / newSpeed);
  }

  return newVel;
}
