import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../../stores/usePlayerStore';

// Posisi default titik tengah office & kamera saat pertama kali game dimuat (App.jsx line 965 & 1061)
const OFFICE_CENTER_TARGET = new THREE.Vector3(0, 1.0, 0);
const OFFICE_DEFAULT_CAMERA_POS = new THREE.Vector3(0, 15, 20);

/**
 * CameraResetter
 * Mengatur pemulihan kamera saat keluar dari peran CEO atau saat CEO pulang:
 * - Mode kamera otomatis kembali ke Isometric (default mode 0).
 * - Jika karakter CEO ADA (visible), titik pusat kamera (controls.target) berada tepat pada karakter CEO
 *   dengan sudut elevasi isometrik default.
 * - Jika karakter CEO TIDAK ADA (CEO pulang / tidak aktif), titik pusat kamera kembali ke titik tengah office [0, 1, 0]
 *   dan posisi kamera [0, 15, 20] (sama seperti saat game pertama kali dimuat).
 * - Mendukung transisi animasi mulus (cubic ease-out) untuk transisi sinematik tanpa patahan visual.
 */
const CameraResetter = ({ 
  controlledNpcId, 
  ceoPos, 
  isCeoVisible, 
  latestPositionsRef,
  isCeoEnteringOffice,
  onCeoEnteredOffice
}) => {
  const { camera, controls } = useThree();
  const prevControlledRef = useRef(controlledNpcId);
  const prevCeoVisibleRef = useRef(isCeoVisible);
  const prevEnteringRef = useRef(isCeoEnteringOffice);

  // Status & interpolasi animasi transisi kamera
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(1.0);
  const startCameraPosRef = useRef(new THREE.Vector3());
  const startTargetRef = useRef(new THREE.Vector3());
  const destCameraPosRef = useRef(new THREE.Vector3());
  const destTargetRef = useRef(new THREE.Vector3());

  const triggerReset = (targetCeo) => {
    // 1. Reset mode kamera global ke Mode 0: Isometric (default) & buka lock
    usePlayerStore.getState().setCameraMode(0);
    usePlayerStore.getState().setIsCameraLocked(false);

    // 2. Tentukan target pusat dan posisi kamera
    const liveCeoPos = latestPositionsRef?.current?.ceo || ceoPos;

    if (targetCeo && liveCeoPos) {
      // Titik pusat adalah karakter CEO
      const cx = liveCeoPos[0];
      const cy = 1.0;
      const cz = liveCeoPos[2];
      destTargetRef.current.set(cx, cy, cz);
      destCameraPosRef.current.set(cx, 15, cz + 20);
    } else {
      // Titik pusat adalah titik tengah office (sama seperti ketika game pertama kali dimuat)
      destTargetRef.current.copy(OFFICE_CENTER_TARGET);
      destCameraPosRef.current.copy(OFFICE_DEFAULT_CAMERA_POS);
    }

    startCameraPosRef.current.copy(camera.position);
    if (controls && controls.target) {
      startTargetRef.current.copy(controls.target);
    } else {
      startTargetRef.current.set(0, 1, 0);
    }

    transitionProgressRef.current = 0.0;
    isTransitioningRef.current = true;

    if (controls) {
      controls.enabled = false;
      controls.enablePan = true;
      controls.minDistance = 3;
      controls.maxDistance = 35;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minPolarAngle = Math.PI / 6;
    }
  };

  const triggerEntranceView = () => {
    // Arahkan pandangan kamera ke area pintu masuk lobi depan secara sinematik
    usePlayerStore.getState().setCameraMode(0);
    usePlayerStore.getState().setIsCameraLocked(false);

    destTargetRef.current.set(11.0, 1.2, 8.0);
    destCameraPosRef.current.set(11.0, 9.0, 16.5);

    startCameraPosRef.current.copy(camera.position);
    if (controls && controls.target) {
      startTargetRef.current.copy(controls.target);
    } else {
      startTargetRef.current.set(0, 1, 0);
    }

    transitionProgressRef.current = 0.0;
    isTransitioningRef.current = true;

    if (controls) {
      controls.enabled = false;
      controls.enablePan = true;
      controls.minDistance = 3;
      controls.maxDistance = 35;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minPolarAngle = Math.PI / 6;
    }
  };

  useEffect(() => {
    const wasEntering = prevEnteringRef.current;
    const isNowEntering = isCeoEnteringOffice;
    prevEnteringRef.current = isCeoEnteringOffice;

    if (!wasEntering && isNowEntering) {
      triggerEntranceView();
      return;
    }
  }, [isCeoEnteringOffice]);

  useEffect(() => {
    const wasControlled = prevControlledRef.current === 'ceo';
    const isNowControlled = controlledNpcId === 'ceo';
    const wasVisible = prevCeoVisibleRef.current;
    const isNowVisible = isCeoVisible;

    prevControlledRef.current = controlledNpcId;
    prevCeoVisibleRef.current = isCeoVisible;

    // Skenario 1: Kembali dari peran CEO (tombol R, klik button '🛑 Berhenti CEO', atau dialog konfirmasi pulang)
    if (wasControlled && !isNowControlled) {
      triggerReset(isNowVisible);
      return;
    }

    // Skenario 2: CEO pulang saat tidak sedang dikontrol (status visible CEO berubah dari true ke false)
    if (!isNowControlled && wasVisible && !isNowVisible) {
      triggerReset(false);
      return;
    }
  }, [controlledNpcId, isCeoVisible, ceoPos, latestPositionsRef]);

  // Loop useFrame untuk animasi transisi mulus & proteksi bound batas fisik
  useFrame((state, delta) => {
    const dt = Math.min(delta || 0.016, 0.1);

    // Cek jika CEO sedang proses masuk kantor dan sudah melewati pintu depan lobi
    if (isCeoEnteringOffice) {
      const liveCeo = latestPositionsRef?.current?.ceo;
      // Pintu lobi depan ada di Z = 9.0. Saat Z <= 8.5 dan Z > 0, CEO sudah berada di dalam kantor
      if (liveCeo && liveCeo[2] <= 8.5 && liveCeo[2] > 0) {
        if (onCeoEnteredOffice) {
          onCeoEnteredOffice();
        }
      }
    }

    // Jika pemain sedang mengontrol CEO, batalkan transisi reset camera
    if (controlledNpcId) {
      isTransitioningRef.current = false;
      return;
    }

    // Jalankan animasi pergerakan kamera menuju target
    if (isTransitioningRef.current) {
      transitionProgressRef.current += dt * 2.4; // Durasi transisi ~0.42 detik
      const t = Math.min(transitionProgressRef.current, 1.0);
      const ease = 1 - Math.pow(1 - t, 3); // Smooth cubic ease-out

      camera.position.lerpVectors(startCameraPosRef.current, destCameraPosRef.current, ease);

      if (controls) {
        controls.target.lerpVectors(startTargetRef.current, destTargetRef.current, ease);
        camera.lookAt(controls.target);
        controls.update();
      } else {
        camera.lookAt(destTargetRef.current);
      }

      if (t >= 1.0) {
        isTransitioningRef.current = false;
        camera.position.copy(destCameraPosRef.current);
        if (controls) {
          controls.target.copy(destTargetRef.current);
          controls.enabled = true;
          controls.update();
        }
      }
      return;
    }

    // Pembatas fisik pergerakan kamera agar tidak menembus lantai (y < 1.0) atau menembus langit (y > 24.0)
    // Berlaku saat mode Free Camera OrbitControls aktif
    if (camera) {
      if (camera.position.y < 1.0) camera.position.y = 1.0;
      if (camera.position.y > 24.0) camera.position.y = 24.0;
    }

    if (controls) {
      // Pastikan sudut polar selalu terlindungi
      if (controls.maxPolarAngle > Math.PI / 2.15) controls.maxPolarAngle = Math.PI / 2.15;
      if (controls.minPolarAngle < Math.PI / 6) controls.minPolarAngle = Math.PI / 6;

      // Batasi target panning agar tidak bisa digeser ke bawah tanah atau ke langit
      if (controls.target.y < 0.2) controls.target.y = 0.2;
      if (controls.target.y > 3.5) controls.target.y = 3.5;
      if (controls.target.x < -20) controls.target.x = -20;
      if (controls.target.x > 20) controls.target.x = 20;
      if (controls.target.z < -18) controls.target.z = -18;
      if (controls.target.z > 15) controls.target.z = 15;
    }
  });

  return null;
};

export default CameraResetter;

