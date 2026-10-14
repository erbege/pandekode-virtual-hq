import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * PLACEHOLDER SKRIP ANIMATED NPC
 * 
 * Komponen ini dibuat untuk membaca file model 3D (format .glb/.gltf)
 * yang memiliki animasi bawaan (seperti Idle dan Walk/Run).
 * 
 * CARA PENGGUNAAN:
 * 1. Download model .glb dari Mixamo (pastikan ada animasi bernama "Idle" dan "Walk").
 * 2. Taruh file .glb tersebut di folder `packages/frontend/public/`.
 * 3. Ganti '/model_npc_placeholder.glb' di bawah ini dengan nama file Anda.
 * 4. Hapus komponen NPCAlex lama di App.jsx dan ganti dengan komponen ini.
 */

const AnimatedNPC = ({ targetPosition, dialogue, modelPath = '/model_npc_placeholder.glb' }) => {
  const group = useRef();
  const speed = 3; 

  // --- 1. LOAD MODEL DAN ANIMASI ---
  // Gunakan error handling (try/catch internal dari Drei) untuk mencegah crash 
  // jika file .glb belum tersedia di public/
  const { scene, animations } = useGLTF(modelPath, true, true);
  
  // Clone scene (Opsional tapi direkomendasikan jika NPC ada banyak agar tidak saling tindih material)
  const clone = useMemo(() => scene.clone(), [scene]);
  
  // Kaitkan animasi dari file .glb ke group (ref) ini
  const { actions } = useAnimations(animations, group);

  // --- 2. LOGIKA STATE ANIMASI ---
  // State untuk melacak animasi apa yang sedang aktif
  // Pastikan nama animasi ("Idle" dan "Walk") SAMA PERSIS (huruf besar/kecil)
  // dengan nama animasi yang diekspor dari Mixamo/Blender.
  const [currentAnim, setCurrentAnim] = useState("Idle");

  // Hook ini akan memicu play() pada animasi baru setiap kali state currentAnim berubah
  useEffect(() => {
    // Mengecek apakah Action yang dicari ada di dalam file .glb
    if (actions && actions[currentAnim]) {
      // Reset ulang, mem-fade in perlahan (0.5 detik), lalu mainkan
      actions[currentAnim].reset().fadeIn(0.5).play();
      
      // Saat state akan berubah, fade out animasi lama perlahan agar transisi mulus
      return () => actions[currentAnim].fadeOut(0.5);
    } else {
      console.warn(`Animasi dengan nama "${currentAnim}" tidak ditemukan dalam file ${modelPath}.`);
    }
  }, [currentAnim, actions, modelPath]);

  // --- 3. LOGIKA GERAKAN DAN PERUBAHAN STATE ---
  useFrame((state, delta) => {
    if (!group.current || !targetPosition) return;
    
    const target = new THREE.Vector3(...targetPosition);
    const current = group.current.position;
    const distance = current.distanceTo(target);
    
    // Jika masih jauh dari target (berarti sedang bergerak)
    if (distance > 0.1) {
      // Ubah status ke animasi jalan
      if (currentAnim !== "Walk") setCurrentAnim("Walk");

      // Menghitung vektor arah menuju tujuan
      const direction = target.clone().sub(current).normalize();
      
      // Putar objek agar menghadap ke arah jalan
      const lookAtTarget = current.clone().add(direction);
      group.current.lookAt(lookAtTarget);
      
      // Pindahkan koordinat (posisi) perlahan
      group.current.position.addScaledVector(direction, speed * delta);
    } else {
      // Jika sudah sampai tujuan / jarak sangat dekat
      if (currentAnim !== "Idle") setCurrentAnim("Idle");
    }
  });

  return (
    // Posisi awal komponen bisa ditaruh di [3, 0, 3] agar menapak di lantai
    <group ref={group} position={[3, 0, 3]} dispose={null}>
      
      {/* 
        Mencetak model 3D yang sudah di-load. 
        Karena kita menggunakan primitive, shadow mungkin perlu dinyalakan
        lewat scene.traverse((child) => { if (child.isMesh) child.castShadow = true })
      */}
      <primitive object={clone} />

      {/* Label Nama & Balon Percakapan yang melayang di atas kepala (Y = 1.8 atau sesuaikan tinggi model) */}
      <Html position={[0, 1.8, 0]} center zIndexRange={[100, 0]}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          minWidth: '80px',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24' }}>
            Alex (PM)
          </div>
          {/* Tampilkan teks chat jika ada dialog */}
          {dialogue && (
            <div style={{ marginTop: '4px', fontSize: '11px', maxWidth: '200px', whiteSpace: 'normal', lineHeight: '1.4' }}>
              "{dialogue}"
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

export default AnimatedNPC;
