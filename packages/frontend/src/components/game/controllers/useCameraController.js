import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Reusable scratch vectors untuk mengeliminasi Garbage Collection (GC) pada 60 FPS
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _idealLookAt = new THREE.Vector3();
const _dampedLookAt = new THREE.Vector3();
const _idealCameraPos = new THREE.Vector3();
const _transCamPos = new THREE.Vector3();
const _transTarget = new THREE.Vector3();
const _camRayDir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _charForward = new THREE.Vector3();

/**
 * Controller Sistem Kamera
 * - R5: Camera Collision Detection & Occlusion Handling (Rapier Raycasting)
 * - R6: Rotasi Isometric via Tombol Q/E
 * - R7: Transisi Sinematik Mulus Antar Mode Kamera
 * - R10: Camera Deadzone & Damped Follow Smoothing
 */
export const useCameraController = ({ isPlayer, cameraMode, isCameraLocked, rapier, world, rbRef, meshRef }) => {
  const isoAngleRef = useRef(0);
  const isoAngleTargetRef = useRef(0);
  const prevCameraModeRef = useRef(cameraMode);
  const prevCameraLockedRef = useRef(isCameraLocked);
  const transitionProgressRef = useRef(1.0); // 1.0 = transisi selesai
  const transitionStartPosRef = useRef(new THREE.Vector3());
  const transitionStartTargetRef = useRef(new THREE.Vector3());
  const hasInitializedLookAtRef = useRef(false);

  // R6: Listener tombol Q / E untuk rotasi sudut kamera Isometric (45 derajat per snap)
  useEffect(() => {
    if (!isPlayer) return;
    const handleRotateKeys = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (cameraMode !== 0 || !isCameraLocked) return;
      const k = e.key.toLowerCase();
      if (k === 'q') {
        isoAngleTargetRef.current += Math.PI / 4;
      } else if (k === 'e') {
        isoAngleTargetRef.current -= Math.PI / 4;
      }
    };
    window.addEventListener('keydown', handleRotateKeys);
    return () => window.removeEventListener('keydown', handleRotateKeys);
  }, [isPlayer, cameraMode, isCameraLocked]);

  /**
   * Dipanggil setiap frame (useFrame) untuk memperbarui posisi dan target kamera
   */
  const updateCamera = (state, dt, currentPos, animRef, isPlayerAtDesk) => {
    // R7: Deteksi perubahan mode kamera atau toggle lock untuk memicu transisi mulus
    const modeChanged = prevCameraModeRef.current !== cameraMode;
    const lockChanged = prevCameraLockedRef.current !== isCameraLocked;

    if (modeChanged || lockChanged) {
      prevCameraModeRef.current = cameraMode;
      prevCameraLockedRef.current = isCameraLocked;
      if (isCameraLocked) {
        transitionProgressRef.current = 0.0;
        transitionStartPosRef.current.copy(state.camera.position);
        if (state.controls && state.controls.target) {
          transitionStartTargetRef.current.copy(state.controls.target);
        } else {
          transitionStartTargetRef.current.set(currentPos.x, currentPos.y + 1.5, currentPos.z);
        }

        // Saat masuk ke Mode 2 (First-Person View):
        // Inisialisasi arah pandang default menatap lurus mendatar ke depan sejajar horizon
        if (cameraMode === 2) {
          _charForward.set(0, 0, 1);
          if (meshRef && meshRef.current) {
            _charForward.applyQuaternion(meshRef.current.quaternion);
            _charForward.y = 0;
            if (_charForward.lengthSq() < 0.001) _charForward.set(0, 0, -1);
            else _charForward.normalize();
          } else {
            _charForward.set(0, 0, -1);
          }

          const eyeY = animRef?.current?.isSitting ? currentPos.y + 1.42 : currentPos.y + 1.55;
          _idealCameraPos.set(currentPos.x, eyeY, currentPos.z);
          _idealLookAt.set(currentPos.x + _charForward.x * 3.0, eyeY, currentPos.z + _charForward.z * 3.0);
          _dampedLookAt.copy(_idealLookAt);

          if (state.controls) {
            state.controls.enabled = false;
            state.controls.minDistance = 0.05;
            state.controls.maxDistance = 0.05;
            state.controls.minPolarAngle = Math.PI * 0.15; // ~63° mendongak ke atas
            state.controls.maxPolarAngle = Math.PI * 0.85; // ~63° menunduk ke bawah
            state.controls.target.set(currentPos.x, eyeY, currentPos.z);
            state.camera.position.set(
              currentPos.x - _charForward.x * 0.05,
              eyeY,
              currentPos.z - _charForward.z * 0.05
            );
            state.camera.lookAt(state.controls.target);
            state.controls.update();
          }
        }
      }
    }

    if (isCameraLocked) {
      // R6: Lerp rotasi isometric ke target angle secara halus
      isoAngleRef.current = THREE.MathUtils.lerp(isoAngleRef.current, isoAngleTargetRef.current, 0.14);

      // 1. Hitung posisi kamera ideal & titik LookAt berdasarkan mode kamera aktif
      if (cameraMode === 0) {
        // Mode 0: Isometric (dengan sudut rotasi Q/E yang dinamis)
        const curAngle = isoAngleRef.current;
        const offsetX = Math.sin(curAngle) * 8;
        const offsetZ = Math.cos(curAngle) * 8;
        _idealLookAt.set(currentPos.x, currentPos.y + 1.5, currentPos.z);
        _idealCameraPos.set(currentPos.x + offsetX, currentPos.y + 8, currentPos.z + offsetZ);
      } else if (cameraMode === 1) {
        // Mode 1: Over-the-Shoulder (OTS)
        state.camera.getWorldDirection(_camForward);
        _camForward.y = 0;
        if (_camForward.lengthSq() < 0.001) _camForward.set(0, 0, -1);
        else _camForward.normalize();
        _camRight.crossVectors(_camForward, _up).normalize();

        _idealLookAt.set(currentPos.x, currentPos.y + 1.5, currentPos.z).addScaledVector(_camRight, -0.4);
        _idealCameraPos.set(currentPos.x, currentPos.y + 1.6, currentPos.z)
          .addScaledVector(_camForward, -2.4)
          .addScaledVector(_camRight, 0.5);
      } else if (cameraMode === 2) {
        // Mode 2: First-Person (FPV)
        const eyeY = animRef?.current?.isSitting ? currentPos.y + 1.42 : currentPos.y + 1.55;
        _idealCameraPos.set(currentPos.x, eyeY, currentPos.z);

        if (transitionProgressRef.current < 1.0) {
          _idealLookAt.set(currentPos.x + _charForward.x * 3.0, eyeY, currentPos.z + _charForward.z * 3.0);
        } else {
          state.camera.getWorldDirection(_forward);
          _forward.y = 0;
          if (_forward.lengthSq() < 0.001) _forward.set(0, 0, -1);
          else _forward.normalize();
          _idealLookAt.set(currentPos.x + _forward.x * 3.0, eyeY, currentPos.z + _forward.z * 3.0);
        }
      }

      // R10: Deadzone & Damped Follow Smoothing untuk target LookAt
      if (!hasInitializedLookAtRef.current) {
        _dampedLookAt.copy(_idealLookAt);
        hasInitializedLookAtRef.current = true;
      } else {
        const DEADZONE_SQ = 0.04; // Deadzone ~0.2 meter
        const distSq = _dampedLookAt.distanceToSquared(_idealLookAt);
        if (distSq > DEADZONE_SQ) {
          _dampedLookAt.lerp(_idealLookAt, Math.min(1.0, dt * 8.0));
        }
      }

      // R5: Camera Collision Detection & Occlusion Handling (Rapier Raycasting)
      // Mencegah kamera menembus dinding atau partisi kubikel pada mode OTS & Isometric
      if (rapier && world && (cameraMode === 1 || cameraMode === 0)) {
        _camRayDir.copy(_idealCameraPos).sub(_dampedLookAt);
        const desiredDist = _camRayDir.length();
        if (desiredDist > 0.1) {
          _camRayDir.normalize();
          const ray = new rapier.Ray(_dampedLookAt, _camRayDir);
          const rawBody = rbRef?.current?.raw ? rbRef.current.raw() : undefined;
          const hit = world.castRay(ray, desiredDist, true, undefined, undefined, undefined, rawBody);
          if (hit && hit.toi > 0.35 && hit.toi < desiredDist) {
            // Dinding / penghalang terdeteksi: dekatkan kamera di depan bidang dinding
            const safeDist = Math.max(0.5, hit.toi - 0.25);
            _idealCameraPos.copy(_dampedLookAt).addScaledVector(_camRayDir, safeDist);
          }
        }
      }

      // 2. Transisi mulus antar mode kamera (R7)
      if (transitionProgressRef.current < 1.0) {
        const TRANSITION_SPEED = 2.6; // Durasi transisi ~0.38 detik
        transitionProgressRef.current = Math.min(transitionProgressRef.current + dt * TRANSITION_SPEED, 1.0);
        const t = transitionProgressRef.current;
        const ease = 1 - Math.pow(1 - t, 3); // Smooth cubic ease-out

        if (state.controls) {
          state.controls.enabled = false;
        }

        _transCamPos.lerpVectors(transitionStartPosRef.current, _idealCameraPos, ease);
        state.camera.position.copy(_transCamPos);

        _transTarget.lerpVectors(transitionStartTargetRef.current, _dampedLookAt, ease);
        state.camera.lookAt(_transTarget);
        if (state.controls) {
          state.controls.target.copy(_transTarget);
        }

        // Saat transisi tepat selesai pada frame ini
        if (transitionProgressRef.current >= 1.0) {
          if (cameraMode === 0) {
            if (state.controls) {
              state.controls.enabled = false;
              state.controls.target.copy(_dampedLookAt);
            }
          } else if (cameraMode === 1) {
            if (state.controls) {
              state.controls.enabled = true;
              state.controls.enablePan = false;
              state.controls.minDistance = 0.5;
              state.controls.maxDistance = 3.2;
              state.controls.maxPolarAngle = Math.PI / 2.15;
              state.controls.minPolarAngle = Math.PI / 6;
              state.controls.target.copy(_dampedLookAt);
              state.controls.update();
            }
          } else if (cameraMode === 2) {
            if (state.controls) {
              state.controls.enabled = true;
              state.controls.enablePan = false;
              state.controls.minDistance = 0.05;
              state.controls.maxDistance = 0.05;
              state.controls.minPolarAngle = Math.PI * 0.15;
              state.controls.maxPolarAngle = Math.PI * 0.85;

              const eyeY = animRef?.current?.isSitting ? currentPos.y + 1.42 : currentPos.y + 1.55;
              state.controls.target.set(currentPos.x, eyeY, currentPos.z);
              state.camera.position.set(
                currentPos.x - _charForward.x * 0.05,
                eyeY,
                currentPos.z - _charForward.z * 0.05
              );
              state.camera.lookAt(state.controls.target);
              state.controls.update();
            }
          }
        }
      } else {
        // 3. Pergerakan kamera stabil saat tidak dalam transisi
        if (cameraMode === 0) {
          state.camera.position.lerp(_idealCameraPos, 0.1);
          state.camera.lookAt(_dampedLookAt);
          if (state.controls) {
            state.controls.enabled = false;
            state.controls.target.copy(_dampedLookAt);
          }
        } else if (cameraMode === 1) {
          if (state.controls) {
            state.controls.enabled = true;
            state.controls.enablePan = false;
            state.controls.minDistance = 0.5;
            state.controls.maxDistance = 3.2;
            state.controls.maxPolarAngle = Math.PI / 2.15;
            state.controls.minPolarAngle = Math.PI / 6;
            state.controls.target.lerp(_dampedLookAt, 0.2);
            state.controls.update();
          }
        } else if (cameraMode === 2) {
          if (state.controls) {
            state.controls.enabled = true;
            state.controls.enablePan = false;
            state.controls.minDistance = 0.05;
            state.controls.maxDistance = 0.05;
            state.controls.minPolarAngle = Math.PI * 0.15;
            state.controls.maxPolarAngle = Math.PI * 0.85;

            const eyeY = animRef?.current?.isSitting ? currentPos.y + 1.42 : currentPos.y + 1.55;
            _idealCameraPos.set(currentPos.x, eyeY, currentPos.z);

            // Geser target & posisi kamera seirama dengan langkah pergerakan pemain
            const dx = _idealCameraPos.x - state.controls.target.x;
            const dy = _idealCameraPos.y - state.controls.target.y;
            const dz = _idealCameraPos.z - state.controls.target.z;
            state.controls.target.copy(_idealCameraPos);
            state.camera.position.x += dx;
            state.camera.position.y += dy;
            state.camera.position.z += dz;
            state.controls.update();
          }
        }
      }
    } else {
      // Free Camera saat isCameraLocked = false
      if (state.controls) {
        state.controls.enabled = true;
        state.controls.enablePan = true;
        state.controls.minDistance = 3;
        state.controls.maxDistance = 35;
        state.controls.maxPolarAngle = Math.PI / 2.15;
        state.controls.minPolarAngle = Math.PI / 6;
      }
    }
  };

  return { updateCamera, isoAngleRef };
};
