import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { getPath, isPointWalkable, getNearestWalkableWorld } from '../../../pathfinder';

// --- Constants & Config ---
const NPC_SPEED = 3.0;
const ARRIVAL_THRESHOLD = 0.25;       // Jarak kuadrat untuk waypoint perantara (~0.5m)
const FINAL_ARRIVAL_THRESHOLD = 0.12; // Jarak kuadrat titik akhir (~0.35m)
const WANDER_MIN_DELAY_MS = 12000;    // Jeda idle wander
const WANDER_MAX_EXTRA_MS = 18000;
const WANDER_RADIUS = 1.5;

// Reusable scratch vectors untuk mengeliminasi Garbage Collection (GC) pada 60 FPS
const _currentVec = new THREE.Vector3();
const _finalTargetVec = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

export const useNPCNavigation = ({
  id,
  targetPosition,
  intent,
  isVisible,
  rbRef,
  meshRef,
  htmlGroupRef,
  animRef,
  onArrive,
  dialogue,
  stopHorizontal,
  latestPositionsRef
}) => {
  const pathRef = useRef([]);
  const pathIndexRef = useRef(0);
  const arrivedRef = useRef(false);
  const lastArrivedTime = useRef(Date.now());
  const stuckFrames = useRef(0);
  const lastPosRef = useRef({ x: 0, z: 0 });
  const lastTargetRef = useRef(null);

  // Kalkulasi rute via A* Pathfinding dengan preferensi pintu koridor Staff Room (diadaptasi dari Proyek 03)
  const calculatePath = useCallback((startPos, endPos, currentIntent) => {
    if (!endPos) return [];

    const end = { x: endPos[0] !== undefined ? endPos[0] : endPos.x, y: startPos.y || 2, z: endPos[2] !== undefined ? endPos[2] : endPos.z };
    const start = { x: startPos.x, y: startPos.y || 2, z: startPos.z };

    // Routing untuk Staff Room agar menggunakan pintu terdekat jika masuk dari luar/koridor
    const isEnteringStaffRoom = start.z > 0 && end.z < 0 && end.x > -6 && end.x < 7;
    let newPath = [];
    if (isEnteringStaffRoom && currentIntent !== "HADI_DESK_0_COLLECT") {
      const doorA = { x: -5, y: startPos.y || 2, z: 0.5 }; // Pintu Kiri
      const doorB = { x: 6, y: startPos.y || 2, z: 0.5 };  // Pintu Kanan
      const chosenDoor = Math.abs(end.x - (-5)) <= Math.abs(end.x - 6) ? doorA : doorB;
      
      const path1 = getPath(start, chosenDoor);
      const path2 = getPath(chosenDoor, end);
      if (path1.length > 0 && path2.length > 0) {
        newPath = [...path1, ...path2.slice(1)];
      } else {
        newPath = getPath(start, end);
      }
    } else {
      newPath = getPath(start, end);
    }

    return newPath;
  }, []);

  // Update rute A* saat targetPosition atau intent berubah
  useEffect(() => {
    if (!rbRef.current || !targetPosition || !isVisible) return;

    const prev = lastTargetRef.current;
    if (prev && prev[0] === targetPosition[0] && prev[1] === targetPosition[1] && prev[2] === targetPosition[2]) {
      return;
    }
    lastTargetRef.current = targetPosition;

    // Jika berpindah ke aktivitas di luar meja kerja, langsung berdiri tegak
    if (intent !== "DESK") {
      animRef.current.isSitting = false;
      animRef.current.isTyping = false;
      if (htmlGroupRef && htmlGroupRef.current) {
        htmlGroupRef.current.position.y = 2.3;
      }
    }

    const currentPos = rbRef.current.translation();
    const newPath = calculatePath(currentPos, targetPosition, intent);
    
    pathRef.current = newPath;
    pathIndexRef.current = newPath.length > 1 ? 1 : 0;
    arrivedRef.current = false;
    stuckFrames.current = 0;
    lastPosRef.current = { x: currentPos.x, z: currentPos.z };
    rbRef.current.wakeUp();
  }, [targetPosition, isVisible, intent, calculatePath, htmlGroupRef, animRef, id]);

  /**
   * Dipanggil setiap frame (useFrame) untuk memperbarui pergerakan dan state AI NPC
   */
  const updateNPCNavigation = (state, dt, currentPos) => {
    _currentVec.set(currentPos.x, currentPos.y, currentPos.z);

    // Jarak horizontal terhadap tujuan akhir
    _finalTargetVec.set(targetPosition[0], currentPos.y, targetPosition[2]);
    const distToFinalSq = (_finalTargetVec.x - currentPos.x) ** 2 + (_finalTargetVec.z - currentPos.z) ** 2;

    // === CEK STATUS DI MEJA KERJA (SITTING & TYPING) - Sesuai Proyek 03 ===
    const isAtDesk = intent === "DESK" && (arrivedRef.current || distToFinalSq < 0.25);

    // === GO_HOME arrival: cek jika sudah melewati pintu depan keluar ke teras ===
    if (intent === "GO_HOME" && currentPos.x > 9.5 && currentPos.z > 9.2) {
      if (!arrivedRef.current) {
        arrivedRef.current = true;
        lastArrivedTime.current = Date.now();
        if (onArrive) onArrive(id, intent);
      }
      stopHorizontal();
      animRef.current.isSitting = false;
      animRef.current.isWalking = false;
      return;
    }

    // === LOGIKA JIKA NPC SUDAH DI MEJA KERJA ===
    if (isAtDesk) {
      stopHorizontal();
      arrivedRef.current = true;
      
      const isShuttingDown = intent === "SHUTDOWN_BEFORE_GO_HOME" || intent === "RETURN_TO_DESK_BEFORE_HOME";
      animRef.current.isSitting = true;
      animRef.current.isTyping = !dialogue && !isShuttingDown;
      animRef.current.isWalking = false;
      animRef.current.isTalking = !!dialogue;

      if (htmlGroupRef && htmlGroupRef.current) {
        htmlGroupRef.current.position.y = 2.15;
      }

      // Hadapkan wajah tepat ke arah laptop & meja kerja masing-masing
      if (currentPos.z < -7.0 && currentPos.z > -8.5 && currentPos.x < 7 && currentPos.x > -6) {
        // Staff Room Baris Belakang (Agung, Bunga, Candra) -> Hadap Utara (-Z)
        meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z - 2);
      } else if (currentPos.z > -7.0 && currentPos.z < -5.5 && currentPos.x < 7 && currentPos.x > -6) {
        // Staff Room Baris Depan (Dika, Eka, Fajar) -> Hadap Selatan (+Z)
        meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
      } else if (currentPos.x > 8 && currentPos.z < -8.5) {
        // Meja CEO -> Hadap Selatan (+Z)
        meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
      } else if (currentPos.x > 8 && currentPos.z < 2 && currentPos.z > 0) {
        // Meja Resepsionis Gita -> Hadap Selatan (+Z)
        meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
      } else if (currentPos.x < -8 && currentPos.z > 5.5) {
        // Hadi di Pantry -> Hadap Selatan (+Z)
        meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
      }
      return;
    }

    // NPC berdiri / sedang berjalan
    animRef.current.isSitting = false;
    animRef.current.isTyping = false;
    animRef.current.isTalking = !!dialogue;
    if (htmlGroupRef && htmlGroupRef.current) {
      htmlGroupRef.current.position.y = 2.3;
    }

    // === AI PATHFOLLOWING & WAYPOINT TRAVERSAL ===
    const path = pathRef.current;
    let pathIndex = pathIndexRef.current;

    if (path.length === 0 || pathIndex >= path.length) {
      stopHorizontal();
      animRef.current.isWalking = false;
      
      if (!arrivedRef.current) {
        arrivedRef.current = true;
        lastArrivedTime.current = Date.now();
        if (onArrive) onArrive(id, intent);
      } else {
        // Idle wander: HANYA jika bukan di meja kerja (DESK), bukan toilet, bukan walk-in CEO, dan bukan GO_HOME
        if (intent !== "GO_HOME" && intent !== "DESK" && intent !== "GO_TO_TOILET" && intent !== "GET_COLD_DRINK" && intent !== "BREW_COFFEE" && intent !== "HADI_BREW_COFFEE" && intent !== "AGUNG_REPORT_TO_CEO" && intent !== "HADI_TIDY_CEO_DESK" && intent !== "CEO_WALK_IN" && Date.now() - lastArrivedTime.current > WANDER_MIN_DELAY_MS + Math.random() * WANDER_MAX_EXTRA_MS) {
          lastArrivedTime.current = Date.now();
          const p = rbRef.current.translation();
          const candidateX = p.x + (Math.random() - 0.5) * WANDER_RADIUS;
          const candidateZ = p.z + (Math.random() - 0.5) * WANDER_RADIUS;
          
          if (isPointWalkable(candidateX, candidateZ)) {
            const targetWander = [candidateX, p.y || 2, candidateZ];
            const newPath = calculatePath(p, targetWander, "WANDER");
            if (newPath.length > 1) {
              pathRef.current = newPath;
              pathIndexRef.current = 1;
              stuckFrames.current = 0;
            }
          }
        }
      }
      return;
    }

    // Waypoint A* aktif saat ini
    const currentTarget = path[pathIndex];
    _targetVec.set(currentTarget.x, currentPos.y, currentTarget.z);
    
    const dx = _targetVec.x - _currentVec.x;
    const dz = _targetVec.z - _currentVec.z;
    const distSq = dx * dx + dz * dz;

    const isLastWaypoint = pathIndex >= path.length - 1;
    const threshold = isLastWaypoint ? FINAL_ARRIVAL_THRESHOLD : ARRIVAL_THRESHOLD;

    // Cek apakah waypoint saat ini sudah tercapai
    if (distSq <= threshold) {
      pathIndexRef.current = pathIndex + 1;
      stuckFrames.current = 0;
      
      if (isLastWaypoint) {
        stopHorizontal();

        if (intent && intent.startsWith("HADI_TV_")) {
          if (intent.includes("_MEETING")) {
            meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z - 2);
          } else if (intent.includes("_CEO")) {
            meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
          } else if (intent.includes("_LOBBY")) {
            meshRef.current.lookAt(_currentVec.x - 2, _currentVec.y, _currentVec.z);
          }
        } else if (intent === "GO_TO_MEETINGROOM" || intent === "KANBAN") {
          meshRef.current.lookAt(-10.5, _currentVec.y, -6.0);
        } else if (intent === "GO_TO_PANTRY") {
          if (_currentVec.x < -12.2) {
            meshRef.current.lookAt(-13.8, _currentVec.y, 8.0);
          } else if (_currentVec.x < -11.0) {
            meshRef.current.lookAt(-11.5, _currentVec.y, 7.8);
          } else {
            meshRef.current.lookAt(-10.5, _currentVec.y, 8.0);
          }
        } else if (intent === "GET_COLD_DRINK" || intent === "GO_TO_FRIDGE") {
          meshRef.current.lookAt(-13.8, _currentVec.y, 8.0); // Menghadap Kulkas Pantry
        } else if (intent === "BREW_COFFEE" || intent === "HADI_BREW_COFFEE" || intent === "GO_TO_COFFEE") {
          meshRef.current.lookAt(-11.5, _currentVec.y, 7.8); // Menghadap Mesin Kopi Espresso
        } else if (intent === "GO_TO_LOUNGE") {
          meshRef.current.lookAt(-10.5, _currentVec.y, 3.5);
        } else if (intent === "GO_TO_LOBBY") {
          meshRef.current.lookAt(11.0, _currentVec.y, 2.0); // Menghadap meja resepsionis Gita
        } else if (intent === "GO_TO_CEOROOM" || intent === "AGUNG_REPORT_TO_CEO" || intent === "HADI_TIDY_CEO_DESK") {
          meshRef.current.lookAt(11.0, _currentVec.y, -9.0); // Menghadap meja kerja CEO
        } else if (intent === "GO_TO_TOILET") {
          meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2); // Menghadap kloset toilet (+Z)
        }

        if (!arrivedRef.current) {
          arrivedRef.current = true;
          lastArrivedTime.current = Date.now();
          if (onArrive) onArrive(id, intent);
        }
        return;
      }
    }

    // Deteksi overshoot waypoint pada segmen perantara
    if (!isLastWaypoint && pathIndex > 0) {
      const prevTarget = path[pathIndex - 1];
      const segX = currentTarget.x - prevTarget.x;
      const segZ = currentTarget.z - prevTarget.z;
      const toCurrX = currentPos.x - currentTarget.x;
      const toCurrZ = currentPos.z - currentTarget.z;
      if (segX * toCurrX + segZ * toCurrZ > 0) {
        pathIndexRef.current = pathIndex + 1;
        stuckFrames.current = 0;
        return;
      }
    }

    // --- DETEKSI TERSANGKUT (STUCK DETECTION) ---
    const frameMoved = Math.hypot(currentPos.x - lastPosRef.current.x, currentPos.z - lastPosRef.current.z);
    lastPosRef.current = { x: currentPos.x, z: currentPos.z };

    animRef.current.isWalking = frameMoved > 0.005;

    if (frameMoved < 0.008 && distSq > threshold) {
      stuckFrames.current += 1;
    } else {
      stuckFrames.current = Math.max(0, stuckFrames.current - 1);
    }

    // --- KALKULASI VEKTOR GERAK LANGSUNG (PROYEK 03) ---
    _direction.set(dx, 0, dz).normalize();
    _moveDir.copy(_direction);
    let moveSpeed = NPC_SPEED;

    // Deselerasi mulus mendekati tujuan akhir
    if (isLastWaypoint && distSq < 1.0) {
      moveSpeed = Math.max(1.2, NPC_SPEED * Math.sqrt(distSq));
    }

    // =========================================================================
    // --- SISTEM PEMULIHAN TERSANGKUT 4-TAHAP (DIADAPTASI DARI PROYEK 03) ---
    // =========================================================================

    // TAHAP 1: Wall-Slide Tangensial (frame > 15)
    if (stuckFrames.current > 15) {
      _tangent.set(-_direction.z, 0, _direction.x);
      if ((Math.floor(stuckFrames.current / 25) % 2) === 1) {
        _tangent.negate();
      }
      _moveDir.copy(_direction).multiplyScalar(0.3).addScaledVector(_tangent, 0.85).normalize();
      moveSpeed = NPC_SPEED * 0.9;
    }

    // TAHAP 2: Repathfinding dinamis (frame 45 & 90)
    if (stuckFrames.current === 45 || stuckFrames.current === 90) {
      const freshPath = calculatePath(currentPos, targetPosition, intent);
      if (freshPath.length > 1) {
        pathRef.current = freshPath;
        pathIndexRef.current = 1;
        rbRef.current.wakeUp();
      }
    }

    // TAHAP 3: Unstick physical impulse vertikal & lateral (frame 70)
    if (stuckFrames.current === 70) {
      rbRef.current.applyImpulse({
        x: -_direction.x * 1.5 + (Math.random() - 0.5) * 1.5,
        y: 0.6,
        z: -_direction.z * 1.5 + (Math.random() - 0.5) * 1.5
      }, true);
      rbRef.current.wakeUp();
    }

    // TAHAP 4: Fail-safe teleport ke koordinat aman terdekat (frame > 140)
    if (stuckFrames.current > 140) {
      const safe = getNearestWalkableWorld(currentPos.x, currentPos.z);
      rbRef.current.setTranslation({ x: safe.x, y: 1.0, z: safe.z }, true);
      rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      stuckFrames.current = 0;
      const repath = calculatePath(safe, targetPosition, intent);
      if (repath.length > 1) {
        pathRef.current = repath;
        pathIndexRef.current = 1;
      }
    }

    // Terapkan kecepatan linear pada Rapier RigidBody (pertahankan gravitasi linvel.y seperti Proyek 03)
    rbRef.current.setLinvel(
      { x: _moveDir.x * moveSpeed, y: rbRef.current.linvel().y, z: _moveDir.z * moveSpeed }, 
      true
    );
    
    // Hadapkan orientasi karakter ke arah gerak secara mulus
    if (_moveDir.lengthSq() > 0.01) {
      _lookTarget.copy(_currentVec).add(_moveDir);
      meshRef.current.lookAt(_lookTarget);
    }
  };

  return { pathRef, pathIndexRef, arrivedRef, calculatePath, updateNPCNavigation };
};
