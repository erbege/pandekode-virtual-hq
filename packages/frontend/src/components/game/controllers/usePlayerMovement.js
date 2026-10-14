import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { keys } from '../../../systems/keyboard';

// --- Constants ---
export const PLAYER_WALK_SPEED = 3.6;   // Kecepatan jalan santai CEO
export const PLAYER_SPRINT_SPEED = 6.8; // Kecepatan lari (Sprint dengan Shift)
export const PLAYER_ACCELERATION = 14;  // Percepatan responsif (~0.25s ke max speed)
export const PLAYER_DECELERATION = 22;  // Perlambatan natural (~0.15s saat melepas tombol)
export const JUMP_INITIAL_VELOCITY = 5.6; // Kecepatan lompatan awal (~0.85m tinggi puncak)
export const JUMP_GRAVITY = 18.0;         // Gravitasi vertikal responsif

// Batas aman area pergerakan pemain (R8: cegah jatuh / keluar area peta)
export const PLAYER_BOUNDS = {
  minX: -26,
  maxX: 26,
  minZ: -22,
  maxZ: 22,
  minY: -0.5
};

// Reusable scratch vectors untuk mengeliminasi Garbage Collection (GC) pada 60 FPS
const _currentVec = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _moveDirection = new THREE.Vector3();
const _playerMoveDir = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();

/**
 * Controller Sistem Pergerakan Pemain (CEO Manual Controls)
 * Menangani:
 * - Input keyboard WASD & Shift (Sprint) & Spasi (Melompat / Jump)
 * - Camera-relative movement & strafe (A/D geser menyamping, S mundur)
 * - Velocity ramping (akselerasi & deselerasi mulus)
 * - Player boundary clamp & void fall recovery (R8)
 * - Pemicu pintu keluar & interaksi meja kerja CEO
 */
export const usePlayerMovement = ({
  isPlayer,
  rbRef,
  meshRef,
  animRef,
  htmlGroupRef,
  targetPosition,
  cameraMode,
  isCameraLocked,
  setIsCameraLocked,
  onWalkThroughDoor,
  onWalkOutDoor,
  isChatOpen,
  stopHorizontal,
  pathRef,
  pathIndexRef,
  forceUpdate,
  dialogue
}) => {
  const playerSpeedRef = useRef(0);
  const jumpVelocityRef = useRef(0);
  const isGroundedRef = useRef(true);
  const lastInputTime = useRef(Date.now());
  const hasTriggeredDoorRef = useRef(false);

  // Reset timer idle setiap kali chat ditutup agar tidak langsung idle
  useEffect(() => {
    if (!isChatOpen && isPlayer) {
      lastInputTime.current = Date.now();
    }
  }, [isChatOpen, isPlayer]);

  /**
   * Dipanggil setiap frame (useFrame) untuk memperbarui fisik pergerakan dan animasi pemain
   */
  const updatePlayerMovement = (state, dt, currentPos) => {
    _currentVec.set(currentPos.x, currentPos.y, currentPos.z);

    // R8: Pembatas batas fisik & proteksi jatuh untuk pemain
    if (currentPos.y < PLAYER_BOUNDS.minY) {
      // Pemain jatuh ke bawah tanah/void -> teleport kembali ke depan pintu masuk kantor
      rbRef.current.setTranslation({ x: 11, y: 0, z: 10 }, true);
      stopHorizontal(0);
      playerSpeedRef.current = 0;
      jumpVelocityRef.current = 0;
      isGroundedRef.current = true;
    } else {
      let clampedX = currentPos.x;
      let clampedZ = currentPos.z;
      let needClamp = false;
      if (currentPos.x < PLAYER_BOUNDS.minX) { clampedX = PLAYER_BOUNDS.minX; needClamp = true; }
      else if (currentPos.x > PLAYER_BOUNDS.maxX) { clampedX = PLAYER_BOUNDS.maxX; needClamp = true; }
      if (currentPos.z < PLAYER_BOUNDS.minZ) { clampedZ = PLAYER_BOUNDS.minZ; needClamp = true; }
      else if (currentPos.z > PLAYER_BOUNDS.maxZ) { clampedZ = PLAYER_BOUNDS.maxZ; needClamp = true; }
      if (needClamp) {
        rbRef.current.setTranslation({ x: clampedX, y: currentPos.y, z: clampedZ }, true);
      }
    }

    // === SISTEM LOMPAT INTENSIONAL (SPACEBAR JUMP) ===
    // 1. Cek status grounded (kontak lantai)
    if (currentPos.y <= 0.04 && jumpVelocityRef.current <= 0.01) {
      isGroundedRef.current = true;
      jumpVelocityRef.current = 0;
    }

    // 2. Input lompat dengan tombol Spasi
    if (keys.space) {
      lastInputTime.current = Date.now();
      if (animRef?.current?.isSitting) {
        // Jika sedang duduk di meja kerja CEO, spasi membuat karakter langsung berdiri
        animRef.current.isSitting = false;
        animRef.current.isTyping = false;
        isGroundedRef.current = true;
      } else if (isGroundedRef.current) {
        // Melompat ke udara
        isGroundedRef.current = false;
        jumpVelocityRef.current = JUMP_INITIAL_VELOCITY;
        rbRef.current.wakeUp();
      }
    }

    // 3. Integrasi vertikal: gravitasi saat di udara vs ground lock saat di lantai
    if (!isGroundedRef.current) {
      jumpVelocityRef.current -= JUMP_GRAVITY * dt;
      // Landing detection
      if (currentPos.y <= 0.01 && jumpVelocityRef.current < 0) {
        isGroundedRef.current = true;
        jumpVelocityRef.current = 0;
        rbRef.current.setTranslation({ x: currentPos.x, y: 0, z: currentPos.z }, true);
        currentPos.y = 0;
      }
    } else {
      // Saat di lantai, kunci posisi Y tepat di 0 agar bebas getaran / micro-hop
      if (currentPos.y < -0.01 || currentPos.y > 0.04) {
        rbRef.current.setTranslation({ x: currentPos.x, y: 0, z: currentPos.z }, true);
        currentPos.y = 0;
      }
    }

    const currentVy = isGroundedRef.current ? 0 : jumpVelocityRef.current;
    if (animRef?.current) {
      animRef.current.isJumping = !isGroundedRef.current;
    }

    const hasInput = keys.w || keys.s || keys.a || keys.d || keys.space;
    const isSprinting = keys.shift && (hasInput && (cameraMode === 0 || keys.w || keys.a || keys.d));
    const targetMaxSpeed = isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;

    // Pemicu pintu keluar untuk pemain
    if (currentPos.x > 9.5 && currentPos.x < 13.5 && currentPos.z > 8.5 && currentPos.z < 13) {
      if (!hasTriggeredDoorRef.current) {
        hasTriggeredDoorRef.current = true;
        if (onWalkOutDoor) onWalkOutDoor();
      }
    } else if (currentPos.z < 8.0 || currentPos.x < 9) {
      hasTriggeredDoorRef.current = false;
    }

    // Arah hadap & kanan relatif terhadap kamera horizontal
    state.camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 0.001) _forward.set(0, 0, -1);
    else _forward.normalize();

    _right.crossVectors(_forward, _up).normalize();

    // Cek apakah pemain berada tepat di meja kerja CEO (dengan deadband/hysteresis)
    const distToDeskSq = targetPosition
      ? (targetPosition[0] - currentPos.x) ** 2 + (targetPosition[2] - currentPos.z) ** 2
      : 999;
    const isPlayerAtDesk = animRef?.current?.isSitting ? distToDeskSq < 0.64 : distToDeskSq < 0.36;

    let isManualMove = false;

    if (hasInput) {
      isManualMove = true;
      lastInputTime.current = Date.now();

      if (pathRef && pathRef.current && pathRef.current.length > 0) {
        pathRef.current = [];
        if (pathIndexRef) pathIndexRef.current = 0;
        if (forceUpdate) forceUpdate(c => c + 1);
      }
      if (!isCameraLocked && setIsCameraLocked) setIsCameraLocked(true);
      rbRef.current.wakeUp();

      // Hitung vektor arah pergerakan AWSD relatif terhadap kamera
      _moveDirection.set(0, 0, 0);
      if (keys.w) _moveDirection.add(_forward);
      if (keys.s) _moveDirection.sub(_forward);
      if (keys.a) _moveDirection.sub(_right);
      if (keys.d) _moveDirection.add(_right);

      if (_moveDirection.lengthSq() > 0.01) {
        _moveDirection.normalize();
        _playerMoveDir.copy(_moveDirection);

        // R2 & R3: Akselerasi bertahap menuju targetMaxSpeed
        if (playerSpeedRef.current < targetMaxSpeed) {
          playerSpeedRef.current = Math.min(
            playerSpeedRef.current + PLAYER_ACCELERATION * dt,
            targetMaxSpeed
          );
        } else if (playerSpeedRef.current > targetMaxSpeed) {
          playerSpeedRef.current = Math.max(
            playerSpeedRef.current - PLAYER_DECELERATION * dt,
            targetMaxSpeed
          );
        }

        rbRef.current.setLinvel({
          x: _moveDirection.x * playerSpeedRef.current,
          y: currentVy,
          z: _moveDirection.z * playerSpeedRef.current
        }, true);

        if (cameraMode === 0) {
          // --- MODE 0: ISOMETRIC (8-Directional Movement / Face Travel Direction) ---
          // Karakter memutar badan secara mulus menghadap arah pergerakan (seperti The Sims / Hades / Diablo)
          const targetRot = Math.atan2(_moveDirection.x, _moveDirection.z);
          _targetQuat.setFromAxisAngle(_up, targetRot);
          meshRef.current.quaternion.slerp(_targetQuat, Math.min(1.0, 14 * dt));

          animRef.current.isWalking = true;
          animRef.current.isSitting = false;
          animRef.current.walkDir = 1; // Selalu melangkah maju ke depan
          animRef.current.strafeDir = 0;
          animRef.current.speed = playerSpeedRef.current;
          animRef.current.isSprinting = isSprinting;
        } else {
          // --- MODE 1 & 2: OTS / FPV (Shooter Strafe / Combat Walk) ---
          // Karakter selalu menghadap arah pandang kamera (_forward) dan strafe ke samping
          _lookTarget.copy(_currentVec).add(_forward);
          meshRef.current.lookAt(_lookTarget);

          animRef.current.isWalking = true;
          animRef.current.isSitting = false;
          animRef.current.walkDir = (keys.w ? 1 : 0) + (keys.s ? -1 : 0);
          animRef.current.strafeDir = (keys.d ? 1 : 0) + (keys.a ? -1 : 0);
          animRef.current.speed = playerSpeedRef.current;
          animRef.current.isSprinting = isSprinting;
        }
      } else {
        // Tombol saling meniadakan (misal W+S atau A+D ditekan serentak)
        playerSpeedRef.current = Math.max(playerSpeedRef.current - PLAYER_DECELERATION * dt, 0);
        if (playerSpeedRef.current > 0.1) {
          rbRef.current.setLinvel({
            x: _playerMoveDir.x * playerSpeedRef.current,
            y: currentVy,
            z: _playerMoveDir.z * playerSpeedRef.current
          }, true);
        } else {
          stopHorizontal(currentVy);
          animRef.current.isWalking = false;
          animRef.current.walkDir = 0;
          animRef.current.strafeDir = 0;
          animRef.current.speed = 0;
          animRef.current.isSprinting = false;
        }
      }
    } else {
      // R2: Deselerasi natural saat tombol dilepas (alih-alih hard-stop mendadak)
      if (playerSpeedRef.current > 0.1) {
        playerSpeedRef.current = Math.max(playerSpeedRef.current - PLAYER_DECELERATION * dt, 0);
        rbRef.current.setLinvel({
          x: _playerMoveDir.x * playerSpeedRef.current,
          y: currentVy,
          z: _playerMoveDir.z * playerSpeedRef.current
        }, true);

        animRef.current.isWalking = playerSpeedRef.current > 0.5;
        animRef.current.speed = playerSpeedRef.current;
        animRef.current.isSprinting = false;
      } else {
        playerSpeedRef.current = 0;
        stopHorizontal(currentVy);
        animRef.current.isWalking = false;
        animRef.current.walkDir = 0;
        animRef.current.strafeDir = 0;
        animRef.current.speed = 0;
        animRef.current.isSprinting = false;
      }

      // Jika dalam mode kamera Over-the-Shoulder atau First-Person dan tidak sedang di meja,
      // sinkronkan arah hadap badan saat kamera diputar
      if (isCameraLocked && (cameraMode === 1 || cameraMode === 2) && !isPlayerAtDesk) {
        _lookTarget.copy(_currentVec).add(_forward);
        meshRef.current.lookAt(_lookTarget);
      }
    }

    // === STATUS IDLE PEMAIN (CEO) ===
    // Pemain HANYA duduk/mengetik JIKA posisinya memang tepat berada di kursi meja kerja CEO DAN sedang tidak bergerak manual serta menapak di lantai.
    if (isPlayerAtDesk && !isManualMove && isGroundedRef.current) {
      animRef.current.isSitting = true;
      animRef.current.isTyping = !dialogue;
      animRef.current.isWalking = false;
      animRef.current.isTalking = !!dialogue;
      if (htmlGroupRef && htmlGroupRef.current) htmlGroupRef.current.position.y = 2.15;
      // Meja CEO -> Hadap Selatan (+Z)
      meshRef.current.lookAt(_currentVec.x, _currentVec.y, _currentVec.z + 2);
    } else if (!isManualMove) {
      animRef.current.isSitting = false;
      animRef.current.isTyping = false;
      animRef.current.isTalking = !!dialogue;
      if (htmlGroupRef && htmlGroupRef.current) htmlGroupRef.current.position.y = 2.3;
    }

    return { isManualMove, isPlayerAtDesk };
  };

  return { updatePlayerMovement, playerSpeedRef };
};
