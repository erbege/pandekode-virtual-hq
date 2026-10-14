import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Text, useTexture, Detailed } from '@react-three/drei';
import { initRectAreaLights } from './systems/lightingSystem';

initRectAreaLights();

// Preload tekstur parquet kayu agar tidak blocking saat render
useTexture.preload([
  './assets/parquet/textures/rectangular_parquet_diff_1k.jpg',
  './assets/parquet/textures/rectangular_parquet_nor_gl_1k.png',
  './assets/parquet/textures/rectangular_parquet_ao_1k.jpg',
]);

// Geometri & Material bersama untuk Dinding dan Lantai Fallback
const defaultWallMat = new THREE.MeshStandardMaterial({ color: "#4b5563", transparent: true, opacity: 0.8 });
const floorFallbackGeo = new THREE.BoxGeometry(30, 0.02, 21);
const floorFallbackMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.6, metalness: 0.05 });

// Komponen Pembantu untuk Dinding (Kembali solid tebal seperti denah)
const Wall = React.memo(({ position, args, color = "#4b5563" }) => {
  const wallMat = useMemo(() => {
    if (color === "#4b5563") return defaultWallMat;
    return new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 });
  }, [color]);

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} friction={0} restitution={0}>
      <mesh castShadow receiveShadow material={wallMat}>
        <boxGeometry args={args} />
      </mesh>
    </RigidBody>
  );
});

// Material bersama untuk Partisi Kaca Kantor (Modern Office Glass Partition)
const glassPaneMat = new THREE.MeshStandardMaterial({
  color: "#dbeafe",
  transparent: true,
  opacity: 0.22,
  roughness: 0.05,
  metalness: 0.1,
});

const glassFrameMat = new THREE.MeshStandardMaterial({
  color: "#1e293b",
  roughness: 0.35,
  metalness: 0.7,
});

const glassFrostMat = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  transparent: true,
  opacity: 0.40,
  roughness: 0.8,
  metalness: 0.05,
});

// Material Kaca Buram Privasi Khusus Jendela Restroom / Toilet (Satin Etched Privacy Glass)
const restroomGlassMat = new THREE.MeshStandardMaterial({
  color: "#f1f5f9",
  transparent: true,
  opacity: 0.85,
  roughness: 0.65,
  metalness: 0.1,
});

// Komponen Partisi Kaca Kantor dengan Kusen Aluminium & Garis Sandblast Dekoratif
const GlassPartition = React.memo(({ position, args }) => {
  const [thickness, height, length] = args;
  const halfH = height / 2;

  // Hitung pembagian panel kaca (setiap ~1.75m panel)
  const panelCount = Math.max(1, Math.round(length / 1.75));
  const panelStep = length / panelCount;

  const mullions = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= panelCount; i++) {
      arr.push(-length / 2 + i * panelStep);
    }
    return arr;
  }, [panelCount, panelStep, length]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Collider Cuboid Rapier yang persis sama dengan Wall asli */}
      <CuboidCollider args={[thickness / 2, height / 2, length / 2]} />

      <group>
        {/* 1. Kaca Utama Transparan */}
        <mesh position={[0, 0, 0]} material={glassPaneMat}>
          <boxGeometry args={[0.08, height - 0.16, length - 0.04]} />
        </mesh>

        {/* 2. Garis Sandblast Safety / Dekorasi di Ketinggian 1.15m */}
        <mesh position={[0, 1.15 - halfH, 0]} material={glassFrostMat}>
          <boxGeometry args={[0.085, 0.12, length - 0.04]} />
        </mesh>

        {/* 3. Rel Kusen Bawah (Base Channel di Lantai) */}
        <mesh castShadow receiveShadow position={[0, 0.04 - halfH, 0]} material={glassFrameMat}>
          <boxGeometry args={[thickness * 0.42, 0.08, length]} />
        </mesh>

        {/* 4. Rel Kusen Atas (Top Channel di Plafon) */}
        <mesh castShadow receiveShadow position={[0, halfH - 0.04, 0]} material={glassFrameMat}>
          <boxGeometry args={[thickness * 0.42, 0.08, length]} />
        </mesh>

        {/* 5. Tiang Kusen Vertikal (Vertical Mullions) */}
        {mullions.map((zOffset, idx) => (
          <mesh 
            key={idx} 
            castShadow 
            receiveShadow 
            position={[0, 0, zOffset]} 
            material={glassFrameMat}
          >
            <boxGeometry args={[thickness * 0.42, height, 0.06]} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
});

// Kusen & Panel Kaca Transom di Atas Pintu Kaca (Memberikan celah jalan setinggi 2.4m di bawahnya)
const GlassDoorTransom = React.memo(({ position, length = 2.0, thickness = 0.4, height = 3.0, orientation = "z" }) => {
  const transomHeight = height - 2.4; // 0.6m
  const transomCenterY = 2.4 + transomHeight / 2; // 2.7m
  const isX = orientation === "x";

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Panel Kaca Transom di Atas Pintu */}
      <mesh material={glassPaneMat} position={[0, transomCenterY, 0]}>
        <boxGeometry args={isX ? [length - 0.06, transomHeight - 0.08, 0.08] : [0.08, transomHeight - 0.08, length - 0.06]} />
      </mesh>
      {/* Rel Kusen Atas Transom di Plafon */}
      <mesh material={glassFrameMat} position={[0, height - 0.04, 0]}>
        <boxGeometry args={isX ? [length, 0.08, thickness * 0.42] : [thickness * 0.42, 0.08, length]} />
      </mesh>
      {/* Balok Kusen Transom Bawah (Header Pintu pada ketinggian 2.4m) */}
      <mesh material={glassFrameMat} position={[0, 2.4, 0]}>
        <boxGeometry args={isX ? [length, 0.08, thickness * 0.42] : [thickness * 0.42, 0.08, length]} />
      </mesh>
      {/* Tiang Kusen Samping Pintu (Door Jambs) */}
      <mesh material={glassFrameMat} position={isX ? [-length / 2, 1.2, 0] : [0, 1.2, -length / 2]}>
        <boxGeometry args={isX ? [0.06, 2.4, thickness * 0.42] : [thickness * 0.42, 2.4, 0.06]} />
      </mesh>
      <mesh material={glassFrameMat} position={isX ? [length / 2, 1.2, 0] : [0, 1.2, length / 2]}>
        <boxGeometry args={isX ? [0.06, 2.4, thickness * 0.42] : [thickness * 0.42, 2.4, 0.06]} />
      </mesh>
    </group>
  );
});

// Komponen Jendela Kaca Eksterior Arsitektural Modern dengan Ambang Bawah (Sill) & Ambang Atas (Header)
// Memenuhi rasio: Tinggi jendela 40%-60% dari total dinding, jarak lantai 15%-30%, jarak plafon 10%-20%
const GlassWindow = React.memo(({ 
  position, 
  length = 3.0, 
  thickness = 0.4, 
  wallHeight = 4.0, 
  floorClearance = 0.9,    // 22.5% dari tinggi dinding (rentang 15% - 30%)
  ceilingClearance = 0.8,  // 20.0% dari tinggi dinding (rentang 10% - 20%)
  orientation = "x" 
}) => {
  const isX = orientation === "x";
  const halfH = wallHeight / 2;

  // Tinggi bukaan jendela kaca (57.5% dari total tinggi dinding, rentang 40% - 60%)
  const windowHeight = wallHeight - floorClearance - ceilingClearance; // 2.3m

  // Posisi Y relatif terhadap pusat dinding (halfH)
  const windowCenterY = -halfH + floorClearance + windowHeight / 2; // -2.0 + 0.9 + 1.15 = +0.05m (world Y = 2.05m)
  const bottomWallCenterY = -halfH + floorClearance / 2;            // -2.0 + 0.45 = -1.55m (world Y = 0.45m)
  const topWallCenterY = halfH - ceilingClearance / 2;              // +2.0 - 0.40 = +1.60m (world Y = 3.60m)

  // Hitung pembagian panel kaca (setiap ~1.5m - 1.75m panel)
  const panelCount = Math.max(1, Math.round(length / 1.6));
  const panelStep = length / panelCount;

  const mullions = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= panelCount; i++) {
      arr.push(-length / 2 + i * panelStep);
    }
    return arr;
  }, [panelCount, panelStep, length]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Collider Fisik Rapier (Frictionless agar NPC/pemain tidak tersangkut) */}
      <CuboidCollider 
        args={isX ? [length / 2, wallHeight / 2, thickness / 2] : [thickness / 2, wallHeight / 2, length / 2]} 
        friction={0}
        restitution={0}
      />

      <group>
        {/* 1. Dinding Parapet Bawah (Sill Wall: Ketinggian Lantai s/d 0.9m) */}
        <mesh castShadow receiveShadow position={[0, bottomWallCenterY, 0]} material={defaultWallMat}>
          <boxGeometry args={isX ? [length, floorClearance, thickness] : [thickness, floorClearance, length]} />
        </mesh>

        {/* 2. Dinding Balok Atas (Lintel / Header Wall: Ketinggian 3.2m s/d 4.0m) */}
        <mesh castShadow receiveShadow position={[0, topWallCenterY, 0]} material={defaultWallMat}>
          <boxGeometry args={isX ? [length, ceilingClearance, thickness] : [thickness, ceilingClearance, length]} />
        </mesh>

        {/* 3. Plat Kusen Ambang Bawah Jendela (Window Sill Cill / Frame) */}
        <mesh castShadow receiveShadow position={[0, -halfH + floorClearance + 0.035, 0]} material={glassFrameMat}>
          <boxGeometry args={isX ? [length, 0.07, thickness * 0.46] : [thickness * 0.46, 0.07, length]} />
        </mesh>

        {/* 4. Plat Kusen Ambang Atas Jendela (Top Window Header Frame) */}
        <mesh castShadow receiveShadow position={[0, halfH - ceilingClearance - 0.035, 0]} material={glassFrameMat}>
          <boxGeometry args={isX ? [length, 0.07, thickness * 0.46] : [thickness * 0.46, 0.07, length]} />
        </mesh>

        {/* 5. Kaca Utama Transparan Double-Glazed di Dalam Bukaan Jendela */}
        <mesh position={[0, windowCenterY, 0]} material={glassPaneMat}>
          <boxGeometry args={isX ? [length - 0.04, windowHeight - 0.14, 0.08] : [0.08, windowHeight - 0.14, length - 0.04]} />
        </mesh>

        {/* 6. Garis Sandblast Safety / Dekoratif di Ketinggian Mata (~1.5m dari lantai) */}
        <mesh position={[0, -halfH + 1.5, 0]} material={glassFrostMat}>
          <boxGeometry args={isX ? [length - 0.04, 0.10, 0.085] : [0.085, 0.10, length - 0.04]} />
        </mesh>

        {/* 7. Tiang Kusen Samping & Vertikal Mullions */}
        {mullions.map((offset, idx) => (
          <mesh 
            key={idx} 
            castShadow 
            receiveShadow 
            position={isX ? [offset, windowCenterY, 0] : [0, windowCenterY, offset]} 
            material={glassFrameMat}
          >
            <boxGeometry args={isX ? [0.06, windowHeight, thickness * 0.46] : [thickness * 0.46, windowHeight, 0.06]} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
});

// Komponen Jendela Kecil Toilet / Restroom (Bovenlicht Kaca Buram Privasi / Privacy Transom Window)
// Ditempatkan tinggi di dinding selatan masing-masing bilik toilet untuk ventilasi & privasi maksimal.
// Ambang bawah (sill) pada ketinggian 2.4m dari lantai (jauh di atas pandangan mata).
// Kaca buram satin (frosted privacy glass) meneruskan cahaya alami tanpa tembus pandang siluet.
const RestroomWindow = React.memo(({ 
  position, 
  length = 1.0, 
  thickness = 0.4, 
  wallHeight = 4.0, 
  floorClearance = 2.4, 
  ceilingClearance = 0.8 
}) => {
  const halfH = wallHeight / 2;
  const windowHeight = wallHeight - floorClearance - ceilingClearance; // 0.8m (Y: 2.4 s/d 3.2m)
  const windowCenterY = -halfH + floorClearance + windowHeight / 2; // -2.0 + 2.4 + 0.4 = +0.8m (world Y = 2.8m)
  const bottomWallCenterY = -halfH + floorClearance / 2; // -2.0 + 1.2 = -0.8m (world Y = 1.2m)
  const topWallCenterY = halfH - ceilingClearance / 2; // +2.0 - 0.4 = +1.6m (world Y = 3.6m)

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Collider Rapier Frictionless agar NPC & pemain tidak tersangkut */}
      <CuboidCollider 
        args={[length / 2, wallHeight / 2, thickness / 2]} 
        friction={0} 
        restitution={0} 
      />

      <group>
        {/* 1. Dinding Parapet Solid Bawah (Sill Wall: Lantai s/d Ketinggian 2.4m) */}
        <mesh castShadow receiveShadow position={[0, bottomWallCenterY, 0]} material={defaultWallMat}>
          <boxGeometry args={[length, floorClearance, thickness]} />
        </mesh>

        {/* 2. Dinding Balok Solid Atas (Lintel / Header: Ketinggian 3.2m s/d 4.0m) */}
        <mesh castShadow receiveShadow position={[0, topWallCenterY, 0]} material={defaultWallMat}>
          <boxGeometry args={[length, ceilingClearance, thickness]} />
        </mesh>

        {/* 3. Plat Kusen Ambang Bawah Jendela (Window Sill Cill) */}
        <mesh castShadow receiveShadow position={[0, -halfH + floorClearance + 0.025, 0]} material={glassFrameMat}>
          <boxGeometry args={[length, 0.05, thickness * 0.46]} />
        </mesh>

        {/* 4. Plat Kusen Ambang Atas Jendela (Top Window Header Frame) */}
        <mesh castShadow receiveShadow position={[0, halfH - ceilingClearance - 0.025, 0]} material={glassFrameMat}>
          <boxGeometry args={[length, 0.05, thickness * 0.46]} />
        </mesh>

        {/* 5. Tiang Kusen Samping Kiri & Kanan (Side Jambs) */}
        <mesh castShadow receiveShadow position={[-length / 2 + 0.025, windowCenterY, 0]} material={glassFrameMat}>
          <boxGeometry args={[0.05, windowHeight - 0.05, thickness * 0.46]} />
        </mesh>
        <mesh castShadow receiveShadow position={[length / 2 - 0.025, windowCenterY, 0]} material={glassFrameMat}>
          <boxGeometry args={[0.05, windowHeight - 0.05, thickness * 0.46]} />
        </mesh>

        {/* 6. Palang Ventilasi Tengah / Transom Bar Daun Jendela Bovenlicht */}
        <mesh castShadow receiveShadow position={[0, windowCenterY, 0]} material={glassFrameMat}>
          <boxGeometry args={[length - 0.06, 0.035, thickness * 0.35]} />
        </mesh>

        {/* 7. Kaca Buram Privasi Toilet (Frosted / Sandblast Privacy Glass) */}
        <mesh position={[0, windowCenterY, 0]} material={restroomGlassMat}>
          <boxGeometry args={[length - 0.05, windowHeight - 0.07, 0.06]} />
        </mesh>

        {/* 8. Ambang Flashing Luar (Exterior Weather Ledge / Drip Cap) */}
        <mesh castShadow position={[0, -halfH + floorClearance + 0.02, thickness / 2 + 0.02]} material={glassFrameMat}>
          <boxGeometry args={[length + 0.04, 0.03, 0.06]} />
        </mesh>
      </group>
    </RigidBody>
  );
});

// Komponen Lantai Kantor dengan Tekstur Parquet Kayu Realistis (Rectangular Parquet 1K)
const OfficeFloor = React.memo(() => {
  const [map, normalMap, aoMap] = useTexture([
    './assets/parquet/textures/rectangular_parquet_diff_1k.jpg',
    './assets/parquet/textures/rectangular_parquet_nor_gl_1k.png',
    './assets/parquet/textures/rectangular_parquet_ao_1k.jpg',
  ]);

  const geoRef = useRef();

  useMemo(() => {
    [map, normalMap, aoMap].forEach((tex) => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        // Ubinan kayu proporsional untuk luas ruangan 30m x 21m
        tex.repeat.set(16, 11.2);
      }
    });
  }, [map, normalMap, aoMap]);

  useEffect(() => {
    if (geoRef.current && !geoRef.current.attributes.uv2) {
      geoRef.current.setAttribute('uv2', geoRef.current.attributes.uv);
    }
  }, []);

  return (
    <mesh position={[0, 0.01, -1.5]} receiveShadow>
      <boxGeometry ref={geoRef} args={[30, 0.02, 21]} />
      <meshStandardMaterial
        map={map}
        normalMap={normalMap}
        normalScale={[0.2, 0.2]}
        aoMap={aoMap}
        aoMapIntensity={1.2}
        roughness={0.30}
        metalness={0.05}
      />
    </mesh>
  );
});

const OfficeFloorFallback = React.memo(() => (
  <mesh position={[0, 0.01, -1.5]} receiveShadow geometry={floorFallbackGeo} material={floorFallbackMat} />
));

// Komponen Grid Presisi Persegi Panjang (hanya mencakup area yang ditentukan)
const AreaGrid = React.memo(({ position, width, depth, step = 1, color = "#64748b", opacity = 0.35 }) => {
  const geometry = useMemo(() => {
    const points = [];
    const halfW = width / 2;
    const halfD = depth / 2;

    // Garis sejajar sumbu Z
    for (let x = -halfW; x <= halfW + 0.001; x += step) {
      points.push(new THREE.Vector3(x, 0, -halfD));
      points.push(new THREE.Vector3(x, 0, halfD));
    }
    // Garis sejajar sumbu X
    for (let z = -halfD; z <= halfD + 0.001; z += step) {
      points.push(new THREE.Vector3(-halfW, 0, z));
      points.push(new THREE.Vector3(halfW, 0, z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [width, depth, step]);

  return (
    <lineSegments position={position} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  );
});

// Geometri & Material bersama untuk DeskLamp
const deskLampBaseGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16);
const deskLampArm1Geo = new THREE.CylinderGeometry(0.015, 0.015, 0.38);
const deskLampArm2Geo = new THREE.CylinderGeometry(0.015, 0.015, 0.28);
const deskLampShadeGeo = new THREE.ConeGeometry(0.11, 0.15, 16);
const deskLampBulbGeo = new THREE.SphereGeometry(0.05, 16, 16);

const deskLampBaseMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.7, roughness: 0.3 });
const deskLampArmMat = new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.8 });
const deskLampShadeMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.3, roughness: 0.5 });

// Lampu Meja Kerja Ergonomis (PointLight realistis + Shadow casting)
const DeskLamp = React.memo(({ position, rotation = [0, 0, 0], color = "#fbbf24", intensity = 1.3 }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.02, 0]} geometry={deskLampBaseGeo} material={deskLampBaseMat} />
    <mesh position={[0, 0.2, 0]} rotation={[0, 0, -0.2]} geometry={deskLampArm1Geo} material={deskLampArmMat} />
    <mesh position={[-0.07, 0.38, 0]} rotation={[0, 0, 0.45]} geometry={deskLampArm2Geo} material={deskLampArmMat} />
    <mesh position={[-0.18, 0.48, 0]} rotation={[0, 0, -0.6]} geometry={deskLampShadeGeo} material={deskLampShadeMat} />
    {/* Bohlam Glowing (Bloom - visible glow orb) */}
    <mesh position={[-0.18, 0.44, 0]} geometry={deskLampBulbGeo}>
      <meshStandardMaterial
        color="#fffef0"
        emissive={color}
        emissiveIntensity={1.8}
        toneMapped={true}
      />
    </mesh>
    {/* PointLight utama - menerangi meja kerja & laptop secara realistis */}
    <pointLight
      position={[-0.18, 0.35, 0]}
      intensity={intensity}
      distance={4.5}
      decay={2}
      color={color}
    />
  </group>
));

// Shared AudioContext untuk latensi instan tanpa blocking main-thread
let sharedSwitchAudioCtx = null;
function getSharedSwitchAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedSwitchAudioCtx) {
    sharedSwitchAudioCtx = new AudioContextClass();
  }
  if (sharedSwitchAudioCtx.state === 'suspended') {
    sharedSwitchAudioCtx.resume().catch(() => {});
  }
  return sharedSwitchAudioCtx;
}

// Audio feedback saat saklar lampu diklik
function playSwitchSound(targetState) {
  try {
    const ctx = getSharedSwitchAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(targetState ? 900 : 550, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (err) {}
}

// Audio feedback saat layar laptop / monitor / TV dinyalakan atau dimatikan
export function playScreenSound(targetState) {
  try {
    const ctx = getSharedSwitchAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (targetState) {
      // Nyala: nada nada naik futuristik (power-on chime)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } else {
      // Mati: nada turun halus (power-down click)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (err) {}
}

// Geometri & Material bersama untuk LightSwitch
const switchPlateGeo = new THREE.BoxGeometry(0.3, 0.42, 0.04);
const switchBezelGeo = new THREE.BoxGeometry(0.2, 0.26, 0.015);
const switchRockerGeo = new THREE.BoxGeometry(0.16, 0.22, 0.025);
const switchLedGeo = new THREE.SphereGeometry(0.022, 12, 12);

const switchPlateMat = new THREE.MeshStandardMaterial({ color: "#f1f5f9", metalness: 0.15, roughness: 0.4 });
const switchPlateHoverMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.15, roughness: 0.2 });
const switchBezelMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.6 });
const switchRockerOnMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3 });
const switchRockerOffMat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.3 });
const switchLedOnMat = new THREE.MeshStandardMaterial({ color: "#4ade80", emissive: "#22c55e", emissiveIntensity: 3.5, toneMapped: false });
const switchLedOffMat = new THREE.MeshStandardMaterial({ color: "#f87171", emissive: "#ef4444", emissiveIntensity: 1.2, toneMapped: false });

// Komponen Saklar Dinding Interaktif (Klik untuk On/Off Lampu Ruangan)
const LightSwitch = React.memo(({ 
  position, 
  rotation = [0, 0, 0], 
  isOn = true, 
  onToggle, 
  roomKey,
  roomName = "Ruangan",
  badgeWidth = 1.5,
  compact = false
}) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onToggle) {
      if (roomKey) onToggle(roomKey);
      else onToggle();
    }
  };

  return (
    <group 
      position={position} 
      rotation={rotation}
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Plat Saklar Dinding (Faceplate Modern) */}
      <mesh receiveShadow position={[0, 0, 0]} geometry={switchPlateGeo} material={hovered ? switchPlateHoverMat : switchPlateMat} />

      {/* Frame Bezel Saklar */}
      <mesh position={[0, -0.02, 0.022]} geometry={switchBezelGeo} material={switchBezelMat} />

      {/* Tombol Rocker Saklar Fisik (Sudut rotasi berubah saat ON vs OFF) */}
      <mesh 
        position={[0, -0.02, 0.03]} 
        rotation={[isOn ? -0.22 : 0.22, 0, 0]}
        geometry={switchRockerGeo}
        material={isOn ? switchRockerOnMat : switchRockerOffMat}
      />

      {/* Lampu Indikator LED Mini (Hijau Terang saat ON, Merah Redup saat OFF) */}
      <mesh position={[0, 0.13, 0.025]} geometry={switchLedGeo} material={isOn ? switchLedOnMat : switchLedOffMat} />

      {/* Cahaya PointLight mini dari LED indikator */}
      <pointLight 
        position={[0, 0.13, 0.06]} 
        intensity={isOn ? 0.25 : 0.06} 
        distance={0.8} 
        decay={2} 
        color={isOn ? "#22c55e" : "#ef4444"} 
      />

    </group>
  );
});

// Geometri & Material bersama untuk LightBulb
const bulbCordGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.0);
const bulbSocketGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.16, 16);
const bulbThreadGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16);
const bulbGlassGeo = new THREE.SphereGeometry(0.13, 20, 20);
const bulbFilamentGeo = new THREE.TorusGeometry(0.035, 0.008, 8, 16);

const bulbCordMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.7 });
const bulbSocketMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.7, roughness: 0.3 });
const bulbThreadMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.9, roughness: 0.2 });
const bulbFilamentMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });

// Komponen Bohlam Gantung Mandiri (Light Bulb) untuk Bilik/Ruangan Toilet
const LightBulb = React.memo(({
  position,
  color = "#fffbeb",
  intensity = 2.2,
  isOn = true
}) => {
  const activeIntensity = isOn ? intensity : 0;

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: isOn ? "#fffef0" : "#cbd5e1",
    emissive: isOn ? color : "#000000",
    emissiveIntensity: isOn ? 1.6 : 0.0,
    transparent: true,
    opacity: isOn ? 0.95 : 0.55,
    roughness: 0.2,
    toneMapped: true,
  }), [isOn, color]);

  return (
    <group position={position}>
      {/* Kabel gantung dari plafon (y=4 sampai ke fitting di y=3.1) */}
      <mesh position={[0, 0.5, 0]} geometry={bulbCordGeo} material={bulbCordMat} />

      {/* Fitting / Soket Lampu Keramik & Tembaga */}
      <mesh position={[0, 0.08, 0]} geometry={bulbSocketGeo} material={bulbSocketMat} />

      {/* Ulir logam bohlam */}
      <mesh position={[0, 0.01, 0]} geometry={bulbThreadGeo} material={bulbThreadMat} />

      {/* Kaca Bohlam (Light Bulb Spherical Glass) */}
      <mesh position={[0, -0.11, 0]} geometry={bulbGlassGeo} material={glassMat} />

      {/* Filamen Glowing interior */}
      {isOn && (
        <mesh position={[0, -0.1, 0]} geometry={bulbFilamentGeo} material={bulbFilamentMat} />
      )}

      {/* Sumber Cahaya PointLight Realistis dari Bohlam */}
      {isOn && (
        <pointLight
          position={[0, -0.15, 0]}
          intensity={activeIntensity}
          distance={10}
          decay={1.8}
          color={color}
        />
      )}
    </group>
  );
});

// Geometri & Material bersama untuk CeilingLamp
const ceilingLampCordGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.8);
const ceilingLampCordMat = new THREE.MeshStandardMaterial({ color: "#374151" });
const ceilingLampHousingMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.6, roughness: 0.3 });

// Lampu Gantung Kantor Linear LED / Neon (RectAreaLight + fill PointLight)
const CeilingLamp = React.memo(({ 
  position, 
  width = 5, 
  rotation = [0, 0, 0], 
  color = "#fef08a", 
  intensity = 4.0,
  isOn = true
}) => {
  const activeIntensity = isOn ? intensity : 0;
  const isWide = width >= 6;

  const housingGeo = useMemo(() => new THREE.BoxGeometry(width, 0.1, 0.3), [width]);
  const diffuserGeo = useMemo(() => new THREE.BoxGeometry(width - 0.08, 0.025, 0.26), [width]);
  const diffuserMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: isOn ? "#fffef8" : "#334155",
    emissive: isOn ? color : "#000000",
    emissiveIntensity: isOn ? 1.6 : 0.0,
    toneMapped: true,
  }), [isOn, color]);

  return (
    <group position={position} rotation={rotation}>
      {/* Kabel gantung */}
      <mesh position={[-width / 2.5, 0.4, 0]} geometry={ceilingLampCordGeo} material={ceilingLampCordMat} />
      <mesh position={[width / 2.5, 0.4, 0]} geometry={ceilingLampCordGeo} material={ceilingLampCordMat} />
      {/* Housing lampu */}
      <mesh position={[0, 0, 0]} castShadow geometry={housingGeo} material={ceilingLampHousingMat} />
      {/* Diffuser LED Glowing Akrilik (berpijar rapi tanpa glare berlebihan) */}
      <mesh position={[0, -0.055, 0]} geometry={diffuserGeo} material={diffuserMat} />
      {/* RectAreaLight utama - selalu mounted dengan intensity dinamis untuk mencegah shader recompilation lag */}
      <rectAreaLight
        position={[0, -0.07, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        width={width - 0.15}
        height={0.8}
        intensity={activeIntensity * 1.0}
        color={color}
      />
      {/* Fill PointLight lembut - selalu mounted dengan intensity dinamis */}
      {isWide ? (
        <>
          <pointLight 
            position={[-width * 0.25, -0.5, 0]} 
            intensity={activeIntensity * 0.35} 
            distance={12} 
            decay={2} 
            color={color} 
          />
          <pointLight 
            position={[width * 0.25, -0.5, 0]} 
            intensity={activeIntensity * 0.35} 
            distance={12} 
            decay={2} 
            color={color} 
          />
        </>
      ) : (
        <pointLight 
          position={[0, -0.5, 0]} 
          intensity={activeIntensity * 0.45} 
          distance={12} 
          decay={2} 
          color={color} 
        />
      )}
    </group>
  );
});

// Geometri & Material bersama untuk MeetingDisplay
const meetingDisplayBezelGeo = new THREE.BoxGeometry(3.8, 2.1, 0.08);
const meetingDisplayScreenGeo = new THREE.PlaneGeometry(3.6, 1.9);
const meetingDisplayLedGeo = new THREE.CircleGeometry(0.02, 12);

const meetingDisplayBezelMat = new THREE.MeshStandardMaterial({ color: "#0a0a0a", metalness: 0.5, roughness: 0.4 });
const meetingDisplayScreenOnMat = new THREE.MeshStandardMaterial({
  color: "#38bdf8",
  emissive: "#0284c7",
  emissiveIntensity: 3.5,
  toneMapped: false,
  roughness: 0.5,
  metalness: 0.1
});
const meetingDisplayScreenOffMat = new THREE.MeshStandardMaterial({
  color: "#05070c",
  emissive: "#000000",
  emissiveIntensity: 0,
  toneMapped: true,
  roughness: 0.2,
  metalness: 0.3
});
const meetingDisplayLedOnMat = new THREE.MeshStandardMaterial({ 
  color: "#22c55e", 
  emissive: "#22c55e", 
  emissiveIntensity: 2.5, 
  toneMapped: false 
});
const meetingDisplayLedOffMat = new THREE.MeshStandardMaterial({ 
  color: "#ef4444", 
  emissive: "#ef4444", 
  emissiveIntensity: 1.2, 
  toneMapped: false 
});

// Layar TV Presentasi Ruang Meeting (Bloom Glow + Light cast + Power State)
const MeetingDisplay = React.memo(({ position, rotation = [0, 0, 0], screenMult = 1.0, isOn = true, onToggle, id }) => {
  const handleClick = () => {
    if (onToggle) {
      if (id) onToggle(id);
      else onToggle();
    }
  };

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      {/* Bezel TV */}
      <mesh castShadow position={[0, 0, 0]} geometry={meetingDisplayBezelGeo} material={meetingDisplayBezelMat} />
      {/* Layar LCD (emissive bloom saat menyala, hitam elegan saat mati) */}
      <mesh 
        position={[0, 0, 0.045]} 
        geometry={meetingDisplayScreenGeo} 
        material={isOn ? meetingDisplayScreenOnMat : meetingDisplayScreenOffMat} 
      />
      {/* Power LED Indicator (Hijau jika ON, Merah Standby jika OFF) */}
      <mesh 
        position={[1.75, -0.95, 0.046]} 
        geometry={meetingDisplayLedGeo} 
        material={isOn ? meetingDisplayLedOnMat : meetingDisplayLedOffMat} 
      />
      {/* PointLight menghantam ruangan dari layar TV hanya saat menyala */}
      {isOn && (
        <pointLight position={[0, 0, 0.5]} intensity={0.5 * screenMult} distance={6} decay={2} color="#38bdf8" />
      )}
      <Detailed distances={[0, 15]}>
        {/* LOD 0: Teks Lengkap saat Dekat (< 15m) */}
        <group>
          {isOn ? (
            <>
              <Text position={[0, 0.4, 0.05]} fontSize={0.22} color="#ffffff" fontWeight="bold">
                PANDEKODE HQ // DASHBOARD
              </Text>
              <Text position={[0, -0.1, 0.05]} fontSize={0.14} color="#bae6fd" textAlign="center" maxWidth={3.2}>
                Sistem Kantor Virtual Aktif • AI Multi-Agent Ready
              </Text>
            </>
          ) : (
            <Text position={[0, 0, 0.05]} fontSize={0.13} color="#334155" fontWeight="bold">
              NO SIGNAL // STANDBY
            </Text>
          )}
        </group>
        {/* LOD 1: Layar Emissive Bersih tanpa Shader Text saat Jauh (>= 15m) */}
        <group />
      </Detailed>
    </group>
  );
});

// Geometri & Material bersama untuk DeskWithLaptop
const deskLegGeo = new THREE.BoxGeometry(0.1, 0.88, 1.3);
const deskTopGeo = new THREE.BoxGeometry(3, 0.08, 1.5);
const laptopBaseGeo = new THREE.BoxGeometry(0.55, 0.03, 0.38);
const laptopKeyboardGeo = new THREE.PlaneGeometry(0.48, 0.2);
const laptopFrameGeo = new THREE.BoxGeometry(0.55, 0.38, 0.03);
const laptopScreenGeo = new THREE.PlaneGeometry(0.5, 0.33);
const laptopLedGeo = new THREE.CircleGeometry(0.006, 8);
const monitorStandBaseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.02, 16);
const monitorStandArmGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04);
const monitorBezelGeo = new THREE.BoxGeometry(0.9, 0.52, 0.03);
const monitorScreenGeo = new THREE.PlaneGeometry(0.85, 0.47);
const monitorLedGeo = new THREE.CircleGeometry(0.008, 8);

const deskLegMat = new THREE.MeshStandardMaterial({ color: "#374151" });
const deskTopMat = new THREE.MeshStandardMaterial({ color: "#8b5a2b" });
const laptopBaseMat = new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.6, roughness: 0.3 });
const laptopKeyboardMat = new THREE.MeshStandardMaterial({ color: "#1e293b" });
const laptopFrameMat = new THREE.MeshStandardMaterial({ color: "#1f2937", metalness: 0.5, roughness: 0.4 });
const monitorStandMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.8 });
const monitorBezelMat = new THREE.MeshStandardMaterial({ color: "#0f172a" });

const deskLedOnMat = new THREE.MeshStandardMaterial({ 
  color: "#22c55e", 
  emissive: "#22c55e", 
  emissiveIntensity: 2.0, 
  toneMapped: false 
});
const deskLedOffMat = new THREE.MeshStandardMaterial({ 
  color: "#ef4444", 
  emissive: "#ef4444", 
  emissiveIntensity: 1.2, 
  toneMapped: false 
});

// Meja Kerja dengan Laptop & Monitor Eksternal (Bloom Glow + Screen light cast + On/Off State)
const DeskWithLaptop = React.memo(({
  position,
  rotation = [0, 0, 0],
  screenColor = "#38bdf8",
  monitorColor = "#60a5fa",
  hasLamp = true,
  lampColor = "#fbbf24",
  lampIntensity = 1.3,
  screenMult = 1.0,
  isScreenOn = true,
  onToggleScreen,
  id,
  renderDeskFrame = true
}) => {
  const handleToggle = () => {
    if (onToggleScreen) {
      if (id) onToggleScreen(id);
      else onToggleScreen();
    }
  };

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <group>
        {/* Daun Meja */}
        <CuboidCollider position={[0, 0.88, 0]} args={[1.5, 0.04, 0.75]} />
        {/* Kaki Kiri */}
        <CuboidCollider position={[-1.4, 0.44, 0]} args={[0.05, 0.44, 0.65]} />
        {/* Kaki Kanan */}
        <CuboidCollider position={[1.4, 0.44, 0]} args={[0.05, 0.44, 0.65]} />
        {/* Laptop Block */}
        <CuboidCollider position={[-0.45, 1.0, 0.1]} args={[0.3, 0.1, 0.2]} />
        {/* Monitor Block */}
        <CuboidCollider position={[0.45, 1.22, -0.1]} args={[0.45, 0.35, 0.15]} />

        {/* Kaki Meja & Daun Meja (jika renderDeskFrame = false, dihandle oleh InstancedOfficeDesks) */}
        {renderDeskFrame && (
          <>
            <mesh position={[-1.4, 0.44, 0]} geometry={deskLegGeo} material={deskLegMat} castShadow receiveShadow />
            <mesh position={[1.4, 0.44, 0]} geometry={deskLegGeo} material={deskLegMat} castShadow receiveShadow />
            <mesh position={[0, 0.88, 0]} geometry={deskTopGeo} material={deskTopMat} castShadow receiveShadow />
          </>
        )}

        {/* --- LAPTOP (Sebelah Kiri) --- */}
        <group onClick={handleToggle}>
          {/* Laptop Base */}
          <mesh position={[-0.45, 0.935, 0.15]} geometry={laptopBaseGeo} material={laptopBaseMat} />
          {/* Keyboard Area */}
          <mesh position={[-0.45, 0.952, 0.17]} geometry={laptopKeyboardGeo} material={laptopKeyboardMat} />
          {/* Laptop Screen Frame */}
          <mesh position={[-0.45, 1.11, -0.03]} rotation={[-0.22, 0, 0]} geometry={laptopFrameGeo} material={laptopFrameMat} />
          {/* Laptop Screen (Bloom Emissive saat ON, Matte Glazed Black saat OFF) */}
          <mesh position={[-0.45, 1.11, -0.012]} rotation={[-0.22, 0, 0]} geometry={laptopScreenGeo}>
            <meshStandardMaterial
              color={isScreenOn ? screenColor : "#080c14"}
              emissive={isScreenOn ? screenColor : "#000000"}
              emissiveIntensity={isScreenOn ? 3.8 * screenMult : 0}
              toneMapped={!isScreenOn}
              roughness={isScreenOn ? 0.5 : 0.25}
              metalness={isScreenOn ? 0.1 : 0.2}
            />
          </mesh>
          {/* Laptop Standby / Power LED */}
          <mesh 
            position={[-0.45 + 0.22, 1.11 - 0.14, -0.01]} 
            rotation={[-0.22, 0, 0]} 
            geometry={laptopLedGeo}
            material={isScreenOn ? deskLedOnMat : deskLedOffMat}
          />
          {/* Cahaya glow layar laptop menyinari keyboard saat ON */}
          {isScreenOn && (
            <pointLight
              position={[-0.45, 1.08, 0.15]}
              intensity={0.3 * screenMult}
              distance={1.6}
              decay={2}
              color={screenColor}
            />
          )}
        </group>

        {/* --- MONITOR EKSTERNAL (Sebelah Kanan) --- */}
        <group onClick={handleToggle}>
          {/* Stand Base */}
          <mesh position={[0.45, 0.93, -0.15]} geometry={monitorStandBaseGeo} material={monitorStandMat} />
          {/* Stand Arm */}
          <mesh position={[0.45, 1.12, -0.18]} geometry={monitorStandArmGeo} material={monitorStandMat} />
          {/* Monitor Bezel */}
          <mesh position={[0.45, 1.29, -0.12]} rotation={[0.05, 0, 0]} geometry={monitorBezelGeo} material={monitorBezelMat} />
          {/* Monitor Glowing Screen (Bloom Emissive saat ON, Matte Glazed Black saat OFF) */}
          <mesh position={[0.45, 1.29, -0.103]} rotation={[0.05, 0, 0]} geometry={monitorScreenGeo}>
            <meshStandardMaterial
              color={isScreenOn ? monitorColor : "#080c14"}
              emissive={isScreenOn ? monitorColor : "#000000"}
              emissiveIntensity={isScreenOn ? 4.2 * screenMult : 0}
              toneMapped={!isScreenOn}
              roughness={isScreenOn ? 0.5 : 0.25}
              metalness={isScreenOn ? 0.1 : 0.2}
            />
          </mesh>
          {/* Monitor Standby / Power LED */}
          <mesh 
            position={[0.45 + 0.38, 1.29 - 0.23, -0.10]} 
            rotation={[0.05, 0, 0]} 
            geometry={monitorLedGeo}
            material={isScreenOn ? deskLedOnMat : deskLedOffMat}
          />
          {/* Cahaya glow monitor eksternal menyinari meja saat ON */}
          {isScreenOn && (
            <pointLight
              position={[0.45, 1.25, 0.18]}
              intensity={0.4 * screenMult}
              distance={2.2}
              decay={2}
              color={monitorColor}
            />
          )}
        </group>

        {/* Desk Lamp di Setiap Meja Kerja (Simulasi Lampu Meja dengan PointLight) */}
        {hasLamp && (
          <DeskLamp
            position={[1.15, 0.92, -0.2]}
            rotation={[0, -0.5, 0]}
            color={lampColor}
            intensity={lampIntensity}
          />
        )}
      </group>
    </RigidBody>
  );
});

// Koordinat data 7 Meja Kerja Staff & CEO
export const OFFICE_DESKS_DATA = [
  // Staff Room - Baris Belakang (Agung, Bunga, Candra)
  { position: [-4, 0, -9], rotation: [0, 0, 0] },
  { position: [0.5, 0, -9], rotation: [0, 0, 0] },
  { position: [5, 0, -9], rotation: [0, 0, 0] },

  // Staff Room - Baris Depan (Dika, Eka, Fajar)
  { position: [-4, 0, -5], rotation: [0, Math.PI, 0] },
  { position: [0.5, 0, -5], rotation: [0, Math.PI, 0] },
  { position: [5, 0, -5], rotation: [0, Math.PI, 0] },

  // CEO Room (Bege)
  { position: [11, 0, -9], rotation: [0, Math.PI, 0] }
];

// Instanced Meshes untuk seluruh Rangka Meja (Daun Meja & Kaki Meja)
// Mengurangi 21 draw calls menjadi hanya 2 draw calls
export const InstancedOfficeDesks = React.memo(() => {
  const topMeshRef = useRef();
  const legMeshRef = useRef();

  useLayoutEffect(() => {
    if (!topMeshRef.current || !legMeshRef.current) return;
    const deskObj = new THREE.Object3D();
    const partObj = new THREE.Object3D();
    deskObj.add(partObj);

    OFFICE_DESKS_DATA.forEach((desk, i) => {
      deskObj.position.set(desk.position[0], desk.position[1], desk.position[2]);
      const rot = desk.rotation || [0, 0, 0];
      deskObj.rotation.set(rot[0], rot[1], rot[2]);

      // Daun Meja
      partObj.position.set(0, 0.88, 0);
      partObj.rotation.set(0, 0, 0);
      deskObj.updateMatrixWorld(true);
      topMeshRef.current.setMatrixAt(i, partObj.matrixWorld);

      // Kaki Kiri
      partObj.position.set(-1.4, 0.44, 0);
      partObj.rotation.set(0, 0, 0);
      deskObj.updateMatrixWorld(true);
      legMeshRef.current.setMatrixAt(i * 2, partObj.matrixWorld);

      // Kaki Kanan
      partObj.position.set(1.4, 0.44, 0);
      partObj.rotation.set(0, 0, 0);
      deskObj.updateMatrixWorld(true);
      legMeshRef.current.setMatrixAt(i * 2 + 1, partObj.matrixWorld);
    });

    topMeshRef.current.instanceMatrix.needsUpdate = true;
    legMeshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  const count = OFFICE_DESKS_DATA.length;

  return (
    <group>
      <instancedMesh ref={topMeshRef} args={[deskTopGeo, deskTopMat, count]} castShadow receiveShadow />
      <instancedMesh ref={legMeshRef} args={[deskLegGeo, deskLegMat, count * 2]} castShadow receiveShadow />
    </group>
  );
});

// Geometri & Material bersama untuk OfficeChair
const chairBaseGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8);
const chairShaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8);
const chairSeatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.5);
const chairBackGeo = new THREE.BoxGeometry(0.5, 0.52, 0.06);
const chairArmGeo = new THREE.BoxGeometry(0.05, 0.18, 0.35);

const chairDarkMat = new THREE.MeshStandardMaterial({ color: "#1f2937" });
const chairMetalMat = new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.8 });
const chairCushionMat = new THREE.MeshStandardMaterial({ color: "#374151", roughness: 0.7 });

// Kursi Kantor Ergonomis Tunggal (Standalone Fallback)
export const OfficeChair = React.memo(({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {/* Roda & Kaki Bintang 5 */}
    <mesh position={[0, 0.05, 0]} geometry={chairBaseGeo} material={chairDarkMat} />
    {/* Tiang Hidrolik */}
    <mesh position={[0, 0.26, 0]} geometry={chairShaftGeo} material={chairMetalMat} />
    {/* Dudukan Kursi (Tinggi Duduk Ergonomis) */}
    <mesh position={[0, 0.48, 0]} geometry={chairSeatGeo} material={chairCushionMat} castShadow receiveShadow />
    {/* Sandaran Punggung */}
    <mesh position={[0, 0.80, -0.22]} rotation={[0.05, 0, 0]} geometry={chairBackGeo} material={chairCushionMat} castShadow />
    {/* Sandaran Tangan Kiri & Kanan */}
    <mesh position={[-0.26, 0.63, 0]} geometry={chairArmGeo} material={chairDarkMat} />
    <mesh position={[0.26, 0.63, 0]} geometry={chairArmGeo} material={chairDarkMat} />
  </group>
));

// Koordinat data 14 Kursi Kantor (Meeting, Staff, CEO, Lobby)
export const OFFICE_CHAIRS_DATA = [
  // Ruang Meeting (6 kursi)
  { position: [-12.8, 0, -4.5], rotation: [0, Math.PI / 2, 0] },
  { position: [-12.8, 0, -6.0], rotation: [0, Math.PI / 2, 0] },
  { position: [-12.8, 0, -7.5], rotation: [0, Math.PI / 2, 0] },
  { position: [-8.2, 0, -4.5], rotation: [0, -Math.PI / 2, 0] },
  { position: [-8.2, 0, -6.0], rotation: [0, -Math.PI / 2, 0] },
  { position: [-8.2, 0, -7.5], rotation: [0, -Math.PI / 2, 0] },

  // Ruang Staff Baris Belakang (3 kursi: Agung, Bunga, Candra)
  { position: [-4, 0, -7.7], rotation: [0, Math.PI, 0] },
  { position: [0.5, 0, -7.7], rotation: [0, Math.PI, 0] },
  { position: [5, 0, -7.7], rotation: [0, Math.PI, 0] },

  // Ruang Staff Baris Depan (3 kursi: Dika, Eka, Fajar)
  { position: [-4, 0, -6.3], rotation: [0, 0, 0] },
  { position: [0.5, 0, -6.3], rotation: [0, 0, 0] },
  { position: [5, 0, -6.3], rotation: [0, 0, 0] },

  // Ruang CEO (1 kursi: Bege)
  { position: [11, 0, -10.3], rotation: [0, 0, 0] },

  // Resepsionis Lobby (1 kursi: Gita)
  { position: [11, 0, 0.95], rotation: [0, 0, 0] },
];

// Instanced Meshes untuk seluruh Kursi Kantor (14 kursi)
// Mengurangi 84 draw calls menjadi hanya 5 draw calls (penurunan 94%)
export const InstancedOfficeChairs = React.memo(() => {
  const baseMeshRef = useRef();
  const shaftMeshRef = useRef();
  const seatMeshRef = useRef();
  const backMeshRef = useRef();
  const armMeshRef = useRef();

  useLayoutEffect(() => {
    if (!baseMeshRef.current || !shaftMeshRef.current || !seatMeshRef.current || !backMeshRef.current || !armMeshRef.current) return;
    const chairObj = new THREE.Object3D();
    const partObj = new THREE.Object3D();
    chairObj.add(partObj);

    OFFICE_CHAIRS_DATA.forEach((chair, i) => {
      chairObj.position.set(chair.position[0], chair.position[1], chair.position[2]);
      const rot = chair.rotation || [0, 0, 0];
      chairObj.rotation.set(rot[0], rot[1], rot[2]);

      // Base
      partObj.position.set(0, 0.05, 0);
      partObj.rotation.set(0, 0, 0);
      chairObj.updateMatrixWorld(true);
      baseMeshRef.current.setMatrixAt(i, partObj.matrixWorld);

      // Shaft
      partObj.position.set(0, 0.26, 0);
      partObj.rotation.set(0, 0, 0);
      chairObj.updateMatrixWorld(true);
      shaftMeshRef.current.setMatrixAt(i, partObj.matrixWorld);

      // Seat
      partObj.position.set(0, 0.48, 0);
      partObj.rotation.set(0, 0, 0);
      chairObj.updateMatrixWorld(true);
      seatMeshRef.current.setMatrixAt(i, partObj.matrixWorld);

      // Back
      partObj.position.set(0, 0.80, -0.22);
      partObj.rotation.set(0.05, 0, 0);
      chairObj.updateMatrixWorld(true);
      backMeshRef.current.setMatrixAt(i, partObj.matrixWorld);

      // Left Arm
      partObj.position.set(-0.26, 0.63, 0);
      partObj.rotation.set(0, 0, 0);
      chairObj.updateMatrixWorld(true);
      armMeshRef.current.setMatrixAt(i * 2, partObj.matrixWorld);

      // Right Arm
      partObj.position.set(0.26, 0.63, 0);
      partObj.rotation.set(0, 0, 0);
      chairObj.updateMatrixWorld(true);
      armMeshRef.current.setMatrixAt(i * 2 + 1, partObj.matrixWorld);
    });

    baseMeshRef.current.instanceMatrix.needsUpdate = true;
    shaftMeshRef.current.instanceMatrix.needsUpdate = true;
    seatMeshRef.current.instanceMatrix.needsUpdate = true;
    backMeshRef.current.instanceMatrix.needsUpdate = true;
    armMeshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  const count = OFFICE_CHAIRS_DATA.length;

  return (
    <group>
      <instancedMesh ref={baseMeshRef} args={[chairBaseGeo, chairDarkMat, count]} />
      <instancedMesh ref={shaftMeshRef} args={[chairShaftGeo, chairMetalMat, count]} />
      <instancedMesh ref={seatMeshRef} args={[chairSeatGeo, chairCushionMat, count]} castShadow receiveShadow />
      <instancedMesh ref={backMeshRef} args={[chairBackGeo, chairCushionMat, count]} castShadow />
      <instancedMesh ref={armMeshRef} args={[chairArmGeo, chairDarkMat, count * 2]} />
    </group>
  );
});

// Geometri & Material bersama untuk KanbanBoard
const kanbanStandGeo = new THREE.CylinderGeometry(0.05, 0.05, 3);
const kanbanBoardGeo = new THREE.BoxGeometry(4, 2, 0.1);
const kanbanNoteGeo = new THREE.BoxGeometry(0.3, 0.3, 0.01);

const kanbanStandMat = new THREE.MeshStandardMaterial({ color: "#9ca3af" });
const kanbanBoardMat = new THREE.MeshStandardMaterial({ color: "#ffffff" });
const kanbanNoteRedMat = new THREE.MeshBasicMaterial({ color: "#fca5a5" });
const kanbanNoteYellowMat = new THREE.MeshBasicMaterial({ color: "#fcd34d" });
const kanbanNoteGreenMat = new THREE.MeshBasicMaterial({ color: "#6ee7b7" });
const kanbanNoteBlueMat = new THREE.MeshBasicMaterial({ color: "#93c5fd" });
const kanbanNotePurpleMat = new THREE.MeshBasicMaterial({ color: "#c084fc" });

// Papan Kanban (Menggantikan Whiteboard lama)
const KanbanBoard = React.memo(({ position, rotation = [0, 0, 0], onClick }) => (
  <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
    {/* Stand */}
    <mesh position={[-1.9, 1.5, 0]} castShadow receiveShadow geometry={kanbanStandGeo} material={kanbanStandMat} />
    <mesh position={[1.9, 1.5, 0]} castShadow receiveShadow geometry={kanbanStandGeo} material={kanbanStandMat} />
    {/* Papan Interaktif */}
    <mesh
      position={[0, 2, 0]}
      castShadow
      receiveShadow
      geometry={kanbanBoardGeo}
      material={kanbanBoardMat}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; }}
    />
    <Detailed distances={[0, 15]}>
      {/* LOD 0: Full Detail (< 15m) */}
      <group>
        {/* Teks Judul Papan */}
        <Text position={[0, 2.5, 0.06]} fontSize={0.2} color="black" fontWeight="bold">KANBAN BOARD</Text>
        {/* Simulasi Sticky Notes (Warna-warni) */}
        <mesh position={[-1.5, 2.2, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteRedMat} />
        <mesh position={[-1.0, 2.2, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteYellowMat} />
        <mesh position={[-0.5, 1.8, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteGreenMat} />
        <mesh position={[0.5, 1.5, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteBlueMat} />
        <mesh position={[1.2, 2.0, 0.06]} geometry={kanbanNoteGeo} material={kanbanNotePurpleMat} />
      </group>
      {/* LOD 1: Low Detail (>= 15m) - Sticky Notes tanpa Shader Teks */}
      <group>
        <mesh position={[-1.5, 2.2, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteRedMat} />
        <mesh position={[-1.0, 2.2, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteYellowMat} />
        <mesh position={[-0.5, 1.8, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteGreenMat} />
        <mesh position={[0.5, 1.5, 0.06]} geometry={kanbanNoteGeo} material={kanbanNoteBlueMat} />
        <mesh position={[1.2, 2.0, 0.06]} geometry={kanbanNoteGeo} material={kanbanNotePurpleMat} />
      </group>
    </Detailed>
  </RigidBody>
));

// Geometri & Material bersama untuk MeetingTable
const meetingTableBaseGeo = new THREE.BoxGeometry(1, 1, 3);
const meetingTableTopGeo = new THREE.BoxGeometry(4, 0.1, 6);
const meetingTableBaseMat = new THREE.MeshStandardMaterial({ color: "#374151" });
const meetingTableTopMat = new THREE.MeshStandardMaterial({ color: "#4b5563" });

// Meja Meeting Besar
const MeetingTable = React.memo(({ position }) => (
  <RigidBody type="fixed" colliders="cuboid" position={position}>
    <mesh position={[0, 0.5, 0]} castShadow geometry={meetingTableBaseGeo} material={meetingTableBaseMat} />
    <mesh position={[0, 1, 0]} castShadow geometry={meetingTableTopGeo} material={meetingTableTopMat} />
  </RigidBody>
));

// Geometri & Material bersama untuk Sofa
const sofaSeatGeo = new THREE.BoxGeometry(3, 0.4, 1.2);
const sofaBackGeo = new THREE.BoxGeometry(3, 0.8, 0.4);
const sofaRedMat = new THREE.MeshStandardMaterial({ color: "#ef4444" });

// Sofa
const Sofa = React.memo(({ position, rotation = [0, 0, 0] }) => (
  <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
    {/* Dudukan */}
    <mesh position={[0, 0.4, 0]} castShadow geometry={sofaSeatGeo} material={sofaRedMat} />
    {/* Sandaran */}
    <mesh position={[0, 0.8, -0.4]} castShadow geometry={sofaBackGeo} material={sofaRedMat} />
  </RigidBody>
));

// Geometri & Material bersama untuk CoffeeTable
const coffeeTableTopGeo = new THREE.BoxGeometry(1.5, 0.05, 0.8);
const coffeeTableLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
const coffeeTableMagGeo = new THREE.BoxGeometry(0.35, 0.015, 0.25);
const coffeeTablePotGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.08);
const coffeeTablePlantGeo = new THREE.SphereGeometry(0.07, 8, 8);

const coffeeTableTopMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.3, metalness: 0.4 });
const coffeeTableLegMat = new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.8 });
const coffeeTableMagMat = new THREE.MeshStandardMaterial({ color: "#f8fafc" });
const coffeeTablePotMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 });
const coffeeTablePlantMat = new THREE.MeshStandardMaterial({ color: "#15803d" });

// Meja Kopi Elegan Minimalis
const CoffeeTable = React.memo(({ position, rotation = [0, 0, 0] }) => (
  <RigidBody type="fixed" colliders="cuboid" friction={0} restitution={0} position={position} rotation={rotation}>
    {/* Daun Meja Kayu Gelap / Kaca Modern */}
    <mesh position={[0, 0.42, 0]} castShadow receiveShadow geometry={coffeeTableTopGeo} material={coffeeTableTopMat} />
    {/* Kaki Meja Logam (4 Titik) */}
    <mesh position={[-0.65, 0.2, -0.3]} geometry={coffeeTableLegGeo} material={coffeeTableLegMat} />
    <mesh position={[0.65, 0.2, -0.3]} geometry={coffeeTableLegGeo} material={coffeeTableLegMat} />
    <mesh position={[-0.65, 0.2, 0.3]} geometry={coffeeTableLegGeo} material={coffeeTableLegMat} />
    <mesh position={[0.65, 0.2, 0.3]} geometry={coffeeTableLegGeo} material={coffeeTableLegMat} />
    {/* Majalah / Dokumen di Meja */}
    <mesh position={[-0.3, 0.45, 0.05]} rotation={[0, 0.2, 0]} geometry={coffeeTableMagGeo} material={coffeeTableMagMat} />
    {/* Pot Tanaman Sukulen Mini */}
    <mesh position={[0.35, 0.48, -0.05]} geometry={coffeeTablePotGeo} material={coffeeTablePotMat} />
    <mesh position={[0.35, 0.54, -0.05]} geometry={coffeeTablePlantGeo} material={coffeeTablePlantMat} />
  </RigidBody>
));

// Geometri & Material bersama untuk Armchair
const armchairSeatGeo = new THREE.BoxGeometry(0.9, 0.36, 0.85);
const armchairBackGeo = new THREE.BoxGeometry(0.9, 0.48, 0.22);
const armchairArmGeo = new THREE.BoxGeometry(0.14, 0.32, 0.85);
const armchairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2);

const armchairLegMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8 });
const armchairDefaultMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.7 });

// Kursi Armchair Tunggal Modern
const Armchair = React.memo(({ position, rotation = [0, 0, 0], color = "#334155" }) => {
  const cushionMat = useMemo(() => {
    if (color === "#334155") return armchairDefaultMat;
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  }, [color]);

  return (
    <RigidBody type="fixed" colliders="cuboid" friction={0} restitution={0} position={position} rotation={rotation}>
      {/* Dudukan */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow geometry={armchairSeatGeo} material={cushionMat} />
      {/* Sandaran Punggung */}
      <mesh position={[0, 0.72, -0.32]} castShadow geometry={armchairBackGeo} material={cushionMat} />
      {/* Sandaran Lengan Kiri & Kanan */}
      <mesh position={[-0.42, 0.55, 0]} geometry={armchairArmGeo} material={cushionMat} />
      <mesh position={[0.42, 0.55, 0]} geometry={armchairArmGeo} material={cushionMat} />
      {/* Kaki Logam */}
      <mesh position={[-0.35, 0.1, -0.3]} geometry={armchairLegGeo} material={armchairLegMat} />
      <mesh position={[0.35, 0.1, -0.3]} geometry={armchairLegGeo} material={armchairLegMat} />
      <mesh position={[-0.35, 0.1, 0.3]} geometry={armchairLegGeo} material={armchairLegMat} />
      <mesh position={[0.35, 0.1, 0.3]} geometry={armchairLegGeo} material={armchairLegMat} />
    </RigidBody>
  );
});

// Geometri & Material bersama untuk ModernSofa
const modernSofaArmGeo = new THREE.BoxGeometry(0.2, 0.34, 0.86);
const modernSofaLegGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.12);

const modernSofaBaseMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.5, roughness: 0.4 });
const modernSofaLegMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.9 });
const modernSofaDefaultCushionMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.75 });

// Sofa Modern Premium dengan Pilihan Warna
const ModernSofa = React.memo(({ position, rotation = [0, 0, 0], width = 2.4, color = "#334155" }) => {
  const baseGeo = useMemo(() => new THREE.BoxGeometry(width, 0.14, 0.9), [width]);
  const seatGeo = useMemo(() => new THREE.BoxGeometry(width - 0.25, 0.32, 0.82), [width]);
  const backGeo = useMemo(() => new THREE.BoxGeometry(width, 0.52, 0.24), [width]);

  const cushionMat = useMemo(() => {
    if (color === "#334155") return modernSofaDefaultCushionMat;
    return new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
  }, [color]);

  return (
    <RigidBody type="fixed" colliders="cuboid" friction={0} restitution={0} position={position} rotation={rotation}>
      {/* Base Rangka */}
      <mesh position={[0, 0.18, 0]} geometry={baseGeo} material={modernSofaBaseMat} />
      {/* Bantalan Dudukan Empuk */}
      <mesh position={[0, 0.40, 0.02]} castShadow receiveShadow geometry={seatGeo} material={cushionMat} />
      {/* Sandaran Punggung */}
      <mesh position={[0, 0.74, -0.32]} castShadow geometry={backGeo} material={cushionMat} />
      {/* Sandaran Lengan Kiri & Kanan */}
      <mesh position={[-(width / 2 - 0.1), 0.54, 0.02]} geometry={modernSofaArmGeo} material={cushionMat} />
      <mesh position={[(width / 2 - 0.1), 0.54, 0.02]} geometry={modernSofaArmGeo} material={cushionMat} />
      {/* Kaki Sofa Chrome */}
      <mesh position={[-(width / 2 - 0.15), 0.06, -0.35]} geometry={modernSofaLegGeo} material={modernSofaLegMat} />
      <mesh position={[(width / 2 - 0.15), 0.06, -0.35]} geometry={modernSofaLegGeo} material={modernSofaLegMat} />
      <mesh position={[-(width / 2 - 0.15), 0.06, 0.35]} geometry={modernSofaLegGeo} material={modernSofaLegMat} />
      <mesh position={[(width / 2 - 0.15), 0.06, 0.35]} geometry={modernSofaLegGeo} material={modernSofaLegMat} />
    </RigidBody>
  );
});

// Geometri & Material bersama untuk WallTV
const wallTvBracketGeo = new THREE.BoxGeometry(1.0, 0.8, 0.05);
const wallTvBezelGeo = new THREE.BoxGeometry(2.8, 1.6, 0.06);
const wallTvTrimGeo = new THREE.BoxGeometry(2.83, 1.63, 0.008);
const wallTvScreenGeo = new THREE.PlaneGeometry(2.7, 1.48);
const wallTvLedGeo = new THREE.CircleGeometry(0.016, 12);
const wallTvHeaderBarGeo = new THREE.PlaneGeometry(2.6, 0.18);
const wallTvFooterBarGeo = new THREE.PlaneGeometry(2.6, 0.12);

const wallTvBracketMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.8 });
const wallTvBezelMat = new THREE.MeshStandardMaterial({ color: "#090d16", metalness: 0.85, roughness: 0.2 });
const wallTvTrimMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.9 });
const wallTvBarMat = new THREE.MeshBasicMaterial({ color: "#0f172a", transparent: true, opacity: 0.85 });
const wallTvScreenOffMat = new THREE.MeshStandardMaterial({
  color: "#05070c",
  emissive: "#000000",
  emissiveIntensity: 0,
  toneMapped: true,
  roughness: 0.2,
  metalness: 0.3
});
const wallTvLedOnMat = new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 2.5, toneMapped: false });
const wallTvLedOffMat = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 1.2, toneMapped: false });

// Televisi Dinding Modern dengan Display Emissive Bloom & UI Ticker + On/Off State
const WallTV = React.memo(({ 
  position, 
  rotation = [0, 0, 0], 
  screenMult = 1.0, 
  title = "PANDEKODE TV", 
  subtitle = "Live Dashboard & Broadcast", 
  accentColor = "#38bdf8",
  screenColor = "#0284c7",
  isOn = true,
  onToggle,
  id
}) => {
  const handleClick = () => {
    if (onToggle) {
      if (id) onToggle(id);
      else onToggle();
    }
  };

  const screenOnMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: screenColor,
    emissive: screenColor,
    emissiveIntensity: 3.2 * screenMult,
    toneMapped: false,
    roughness: 0.5,
    metalness: 0.1,
  }), [screenColor, screenMult]);

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      {/* Wall Mount Bracket */}
      <mesh position={[0, 0, -0.04]} geometry={wallTvBracketGeo} material={wallTvBracketMat} />
      {/* TV Bezel / Frame */}
      <mesh position={[0, 0, 0]} castShadow geometry={wallTvBezelGeo} material={wallTvBezelMat} />
      {/* Layar Emissive LCD (Hitam elegan saat OFF) */}
      <mesh 
        position={[0, 0, 0.035]} 
        geometry={wallTvScreenGeo} 
        material={isOn ? screenOnMat : wallTvScreenOffMat} 
      />
      {/* Cahaya Pendaran TV menghantam ruangan */}
      {isOn && (
        <pointLight 
          position={[0, 0, 0.45]} 
          intensity={0.6 * screenMult} 
          distance={5.5} 
          decay={2} 
          color={accentColor} 
        />
      )}
      <Detailed distances={[0, 15]}>
        {/* LOD 0: Tampilan Lengkap UI Dashboard & Ticker (< 15m) */}
        <group>
          {/* Bezel Trim Tipis */}
          <mesh position={[0, 0, 0.032]} geometry={wallTvTrimGeo} material={wallTvTrimMat} />
          {/* Standby / Active LED Indicator di Bezel Bawah */}
          <mesh 
            position={[1.25, -0.73, 0.036]} 
            geometry={wallTvLedGeo} 
            material={isOn ? wallTvLedOnMat : wallTvLedOffMat} 
          />
          {isOn ? (
            <>
              {/* Header Bar TV */}
              <mesh position={[0, 0.58, 0.04]} geometry={wallTvHeaderBarGeo} material={wallTvBarMat} />
              <Text position={[0, 0.58, 0.045]} fontSize={0.13} color="#ffffff" fontWeight="bold">
                {title}
              </Text>
              {/* Content Display / Ticker */}
              <Text position={[0, 0.05, 0.045]} fontSize={0.11} color="#f0f9ff" textAlign="center" maxWidth={2.4}>
                {subtitle}
              </Text>
              {/* Footer Bar */}
              <mesh position={[0, -0.58, 0.04]} geometry={wallTvFooterBarGeo} material={wallTvBarMat} />
              <Text position={[0, -0.58, 0.045]} fontSize={0.08} color={accentColor} fontWeight="bold">
                STATUS: ONLINE • AI ORCHESTRATOR READY
              </Text>
            </>
          ) : (
            <Text position={[0, 0, 0.042]} fontSize={0.12} color="#334155" fontWeight="bold">
              NO SIGNAL // STANDBY
            </Text>
          )}
        </group>
        {/* LOD 1: Layar Emissive Elegan tanpa Font Shader Text (>= 15m) */}
        <group />
      </Detailed>
    </group>
  );
});

// Laptop Resepsionis di Meja Lobi (Gita)
const ReceptionDeskLaptop = React.memo(({
  position,
  rotation = [0, 0, 0],
  screenColor = "#38bdf8",
  screenMult = 1.0,
  isOn = true,
  onToggle,
  id
}) => {
  const handleClick = () => {
    if (onToggle) {
      if (id) onToggle(id);
      else onToggle();
    }
  };

  const screenMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: isOn ? screenColor : "#080c14",
    emissive: isOn ? screenColor : "#000000",
    emissiveIntensity: isOn ? 3.8 * screenMult : 0,
    toneMapped: !isOn,
    roughness: isOn ? 0.5 : 0.25,
    metalness: isOn ? 0.1 : 0.2,
  }), [isOn, screenColor, screenMult]);

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      {/* Base Laptop */}
      <mesh position={[0, 0.015, 0]} geometry={laptopBaseGeo} material={laptopBaseMat} />
      {/* Keyboard */}
      <mesh position={[0, 0.032, 0.02]} geometry={laptopKeyboardGeo} material={laptopKeyboardMat} />
      {/* Screen Frame */}
      <mesh position={[0, 0.19, -0.18]} rotation={[-0.22, 0, 0]} geometry={laptopFrameGeo} material={laptopFrameMat} />
      {/* Screen Display Plane */}
      <mesh position={[0, 0.19, -0.162]} rotation={[-0.22, 0, 0]} geometry={laptopScreenGeo} material={screenMat} />
      {/* Standby / Active LED */}
      <mesh 
        position={[0.22, 0.05, -0.16]} 
        rotation={[-0.22, 0, 0]} 
        geometry={laptopLedGeo} 
        material={isOn ? deskLedOnMat : deskLedOffMat} 
      />
      {/* Light cast saat ON */}
      {isOn && (
        <pointLight
          position={[0, 0.16, 0.0]}
          intensity={0.3 * screenMult}
          distance={1.6}
          decay={2}
          color={screenColor}
        />
      )}
    </group>
  );
});

// Geometri & Material bersama untuk StandingWhiteboard
const whiteboardFootGeo = new THREE.BoxGeometry(0.06, 0.06, 0.7);
const whiteboardCasterGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03);
const whiteboardPoleGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.0);
const whiteboardBoardGeo = new THREE.BoxGeometry(2.2, 1.3, 0.04);
const whiteboardFrameGeo = new THREE.BoxGeometry(2.24, 1.34, 0.035);
const whiteboardTrayGeo = new THREE.BoxGeometry(1.5, 0.025, 0.08);
const whiteboardMarkerGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.16);
const whiteboardEraserGeo = new THREE.BoxGeometry(0.16, 0.03, 0.06);
const whiteboardNoteGeo = new THREE.BoxGeometry(0.22, 0.22, 0.005);

const whiteboardFootMat = new THREE.MeshStandardMaterial({ color: "#475569", metalness: 0.8 });
const whiteboardCasterMat = new THREE.MeshStandardMaterial({ color: "#0f172a" });
const whiteboardPoleMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.85, roughness: 0.2 });
const whiteboardBoardMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.15, metalness: 0.05 });
const whiteboardFrameMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8 });
const whiteboardTrayMat = new THREE.MeshStandardMaterial({ color: "#64748b", metalness: 0.7 });
const whiteboardMarkerBlueMat = new THREE.MeshStandardMaterial({ color: "#2563eb" });
const whiteboardMarkerRedMat = new THREE.MeshStandardMaterial({ color: "#dc2626" });
const whiteboardMarkerBlackMat = new THREE.MeshStandardMaterial({ color: "#0f172a" });
const whiteboardEraserMat = new THREE.MeshStandardMaterial({ color: "#475569" });
const whiteboardNoteYellowMat = new THREE.MeshBasicMaterial({ color: "#fef08a" });
const whiteboardNoteGreenMat = new THREE.MeshBasicMaterial({ color: "#a7f3d0" });
const whiteboardNotePinkMat = new THREE.MeshBasicMaterial({ color: "#fbcfe8" });

// Papan Standing Whiteboard Mobile dengan Roda & Spidol
const StandingWhiteboard = React.memo(({ position, rotation = [0, 0, 0] }) => (
  <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
    {/* Kaki Horizontal Kiri & Kanan dengan Roda */}
    <mesh position={[-1.0, 0.06, 0]} geometry={whiteboardFootGeo} material={whiteboardFootMat} />
    <mesh position={[1.0, 0.06, 0]} geometry={whiteboardFootGeo} material={whiteboardFootMat} />
    {/* Tiang Vertikal Kiri & Kanan */}
    <mesh position={[-1.0, 1.05, 0]} geometry={whiteboardPoleGeo} material={whiteboardPoleMat} />
    <mesh position={[1.0, 1.05, 0]} geometry={whiteboardPoleGeo} material={whiteboardPoleMat} />
    {/* Papan Putih Magnetik & Frame */}
    <mesh position={[0, 1.35, 0]} castShadow receiveShadow geometry={whiteboardBoardGeo} material={whiteboardBoardMat} />
    <mesh position={[0, 1.35, 0.005]} geometry={whiteboardFrameGeo} material={whiteboardFrameMat} />
    <Detailed distances={[0, 15]}>
      {/* LOD 0: Full Detail dengan Casters, Spidol, Eraser, dan 3 Teks (< 15m) */}
      <group>
        {/* Roda Caster Mini (4 titik) */}
        <mesh position={[-1.0, 0.03, -0.3]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardCasterGeo} material={whiteboardCasterMat} />
        <mesh position={[-1.0, 0.03, 0.3]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardCasterGeo} material={whiteboardCasterMat} />
        <mesh position={[1.0, 0.03, -0.3]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardCasterGeo} material={whiteboardCasterMat} />
        <mesh position={[1.0, 0.03, 0.3]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardCasterGeo} material={whiteboardCasterMat} />
        {/* Tray Tempat Spidol & Penghapus di Bawah Papan */}
        <mesh position={[0, 0.68, 0.05]} geometry={whiteboardTrayGeo} material={whiteboardTrayMat} />
        {/* Spidol (Biru, Merah, Hitam) & Penghapus */}
        <mesh position={[-0.4, 0.705, 0.05]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardMarkerGeo} material={whiteboardMarkerBlueMat} />
        <mesh position={[-0.2, 0.705, 0.05]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardMarkerGeo} material={whiteboardMarkerRedMat} />
        <mesh position={[0.0, 0.705, 0.05]} rotation={[0, 0, Math.PI / 2]} geometry={whiteboardMarkerGeo} material={whiteboardMarkerBlackMat} />
        <mesh position={[0.35, 0.71, 0.05]} geometry={whiteboardEraserGeo} material={whiteboardEraserMat} />
        {/* Tulisan & Diagram Strategi di Atas Papan */}
        <Text position={[0, 1.82, 0.025]} fontSize={0.12} color="#0f172a" fontWeight="bold">
          CEO STRATEGY & ROADMAP 2027
        </Text>
        {/* Sticky Notes & Diagram */}
        <mesh position={[-0.75, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNoteYellowMat} />
        <mesh position={[-0.45, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNoteGreenMat} />
        <mesh position={[-0.15, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNotePinkMat} />
        <Text position={[0.35, 1.45, 0.025]} fontSize={0.08} color="#1e293b" maxWidth={1.0} textAlign="left">
          {"● AI Multi-Agent Core\n● 3D Spatial Workplace\n● Auto-Task Dispatcher"}
        </Text>
        <Text position={[-0.4, 1.05, 0.025]} fontSize={0.08} color="#334155" maxWidth={1.8} textAlign="left">
          {"TARGET Q4: Release Multi-User Collab & Smart Voice"}
        </Text>
      </group>
      {/* LOD 1: Low Detail - Sticky Notes tanpa Shader Teks & partikel mini (>= 15m) */}
      <group>
        <mesh position={[-0.75, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNoteYellowMat} />
        <mesh position={[-0.45, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNoteGreenMat} />
        <mesh position={[-0.15, 1.5, 0.025]} geometry={whiteboardNoteGeo} material={whiteboardNotePinkMat} />
      </group>
    </Detailed>
  </RigidBody>
));

// Geometri & Material bersama untuk KitchenCounter
const kitchenCounterBaseGeo = new THREE.BoxGeometry(4, 1.2, 1.5);
const kitchenCounterTopGeo = new THREE.BoxGeometry(4.2, 0.1, 1.7);
const kitchenCounterBaseMat = new THREE.MeshStandardMaterial({ color: "#d1d5db" });
const kitchenCounterTopMat = new THREE.MeshStandardMaterial({ color: "#111827" });

// Counter Pantry
const KitchenCounter = React.memo(({ position, rotation = [0, 0, 0] }) => (
  <RigidBody type="fixed" colliders="cuboid" friction={0} restitution={0} position={position} rotation={rotation}>
    <mesh position={[0, 0.6, 0]} castShadow geometry={kitchenCounterBaseGeo} material={kitchenCounterBaseMat} />
    <mesh position={[0, 1.25, 0]} castShadow geometry={kitchenCounterTopGeo} material={kitchenCounterTopMat} />
  </RigidBody>
));

// Geometri & Material bersama untuk Refrigerator
const fridgeBodyGeo = new THREE.BoxGeometry(0.95, 1.88, 0.8);
const fridgeInteriorCavityGeo = new THREE.BoxGeometry(0.86, 1.08, 0.36);
const fridgeShelfGeo = new THREE.BoxGeometry(0.84, 0.015, 0.32);
const fridgeCanGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.09, 12);
const fridgeBottleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.13, 12);
const fridgeBottleCapGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10);
const fridgeDoorTopLeftGeo = new THREE.BoxGeometry(0.46, 1.12, 0.05);
const fridgeDoorTopRightGeo = new THREE.BoxGeometry(0.46, 1.12, 0.05);
const fridgeDoorBottomGeo = new THREE.BoxGeometry(0.93, 0.64, 0.05);
const fridgeHandleVerticalGeo = new THREE.BoxGeometry(0.025, 0.7, 0.04);
const fridgeHandleHorizontalGeo = new THREE.BoxGeometry(0.65, 0.025, 0.04);
const fridgeDispenserGeo = new THREE.BoxGeometry(0.24, 0.32, 0.02);
const fridgeDispenserLcdGeo = new THREE.PlaneGeometry(0.18, 0.06);
const fridgeStickyYellowGeo = new THREE.BoxGeometry(0.11, 0.11, 0.005);
const fridgeStickyPinkGeo = new THREE.BoxGeometry(0.09, 0.09, 0.005);
const fridgeMagnetGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 12);

const fridgeBodyMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.6, roughness: 0.35 });
const fridgeInteriorMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.15 });
const fridgeGlassShelfMat = new THREE.MeshStandardMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.75, roughness: 0.1 });
const fridgeStainlessMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.85, roughness: 0.22 });
const fridgeHandleMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.9, roughness: 0.2 });
const fridgeDispenserMat = new THREE.MeshStandardMaterial({ color: "#090d16", roughness: 0.15 });
const fridgeDispenserLcdMat = new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false });
const fridgeStickyYellowMat = new THREE.MeshBasicMaterial({ color: "#fef08a" });
const fridgeStickyPinkMat = new THREE.MeshBasicMaterial({ color: "#fbcfe8" });
const fridgeMagnetMat = new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.3 });

const sodaCanRedMat = new THREE.MeshStandardMaterial({ color: "#dc2626", metalness: 0.8, roughness: 0.2 });
const sodaCanBlueMat = new THREE.MeshStandardMaterial({ color: "#2563eb", metalness: 0.8, roughness: 0.2 });
const sodaCanGreenMat = new THREE.MeshStandardMaterial({ color: "#16a34a", metalness: 0.8, roughness: 0.2 });
const coldBrewCanMat = new THREE.MeshStandardMaterial({ color: "#1c1917", metalness: 0.85, roughness: 0.2 });
const waterBottleMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", transparent: true, opacity: 0.65, roughness: 0.1 });
const bottleCapMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.5 });

// Audio feedback kulkas buka / tutup
function playFridgeSound(opening) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (opening) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.20, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.10);
      gain.gain.setValueAtTime(0.24, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    }
  } catch (err) {}
}

// Komponen Kulkas Kantor Premium 2-Pintu French Door dengan Animasi Buka/Tutup Bebas Tabrakan
const Refrigerator = React.memo(({ position, rotation = [0, 0, 0], isOpen: externalIsOpen, onToggle: externalOnToggle }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  
  const leftPivotRef = useRef();
  const rightPivotRef = useRef();
  const currentAngleRef = useRef(0);
  const lastStateRef = useRef(false);

  useEffect(() => {
    if (isOpen !== lastStateRef.current) {
      lastStateRef.current = isOpen;
      playFridgeSound(isOpen);
    }
  }, [isOpen]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (externalOnToggle) {
      externalOnToggle();
    } else {
      setInternalOpen(prev => {
        const next = !prev;
        if (next) {
          setTimeout(() => setInternalOpen(false), 4000);
        }
        return next;
      });
    }
  };

  useFrame((_, delta) => {
    const target = isOpen ? 1.35 : 0.0;
    currentAngleRef.current = THREE.MathUtils.damp(currentAngleRef.current, target, 5.5, delta);
    if (leftPivotRef.current) {
      leftPivotRef.current.rotation.y = -currentAngleRef.current;
    }
    if (rightPivotRef.current) {
      rightPivotRef.current.rotation.y = currentAngleRef.current;
    }
  });

  return (
    <RigidBody type="fixed" colliders={false} friction={0} restitution={0} position={position} rotation={rotation}>
      {/* Collider Rapier HANYA di bagian belakang/badan kulkas. Pintu TIDAK memiliki collider sehingga NPC tidak pernah terdorong atau tersangkut */}
      <CuboidCollider args={[0.47, 0.94, 0.36]} position={[0, 0.94, 0.04]} friction={0} restitution={0} />
      <group 
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        {/* Badan Utama Kulkas */}
        <mesh position={[0, 0.94, 0]} castShadow geometry={fridgeBodyGeo} material={fridgeBodyMat} />

        {/* Interior Cavity & Rak Minuman Dingin (Terlihat saat pintu terbuka) */}
        <mesh position={[0, 1.28, -0.19]} geometry={fridgeInteriorCavityGeo} material={fridgeInteriorMat} />
        {/* Rak Kaca Tempered 1 (Atas) */}
        <mesh position={[0, 1.55, -0.19]} geometry={fridgeShelfGeo} material={fridgeGlassShelfMat} />
        {/* Rak Kaca Tempered 2 (Tengah) */}
        <mesh position={[0, 1.30, -0.19]} geometry={fridgeShelfGeo} material={fridgeGlassShelfMat} />
        {/* Rak Kaca Tempered 3 (Bawah) */}
        <mesh position={[0, 1.05, -0.19]} geometry={fridgeShelfGeo} material={fridgeGlassShelfMat} />

        {/* Minuman Dingin di Rak Atas: Kaleng Soda & Cold Brew */}
        <mesh position={[-0.26, 1.60, -0.22]} geometry={fridgeCanGeo} material={sodaCanRedMat} />
        <mesh position={[-0.14, 1.60, -0.22]} geometry={fridgeCanGeo} material={sodaCanBlueMat} />
        <mesh position={[0.14, 1.60, -0.22]} geometry={fridgeCanGeo} material={sodaCanGreenMat} />
        <mesh position={[0.26, 1.60, -0.22]} geometry={fridgeCanGeo} material={coldBrewCanMat} />

        {/* Minuman Dingin di Rak Tengah: Botol Air Mineral Dingin */}
        <group position={[-0.22, 1.37, -0.22]}>
          <mesh geometry={fridgeBottleGeo} material={waterBottleMat} />
          <mesh position={[0, 0.075, 0]} geometry={fridgeBottleCapGeo} material={bottleCapMat} />
        </group>
        <group position={[0.0, 1.37, -0.22]}>
          <mesh geometry={fridgeBottleGeo} material={waterBottleMat} />
          <mesh position={[0, 0.075, 0]} geometry={fridgeBottleCapGeo} material={bottleCapMat} />
        </group>
        <group position={[0.22, 1.37, -0.22]}>
          <mesh geometry={fridgeBottleGeo} material={waterBottleMat} />
          <mesh position={[0, 0.075, 0]} geometry={fridgeBottleCapGeo} material={bottleCapMat} />
        </group>

        {/* Minuman Dingin di Rak Bawah: Soda & Minuman Energi */}
        <mesh position={[-0.20, 1.10, -0.22]} geometry={fridgeCanGeo} material={sodaCanBlueMat} />
        <mesh position={[-0.07, 1.10, -0.22]} geometry={fridgeCanGeo} material={sodaCanRedMat} />
        <mesh position={[0.07, 1.10, -0.22]} geometry={fridgeCanGeo} material={coldBrewCanMat} />
        <mesh position={[0.20, 1.10, -0.22]} geometry={fridgeCanGeo} material={sodaCanGreenMat} />

        {/* Pencahayaan Dingin Interior Kulkas (Glow Ice-Blue menyala saat pintu terbuka) */}
        <pointLight position={[0, 1.55, -0.18]} color="#bae6fd" intensity={isOpen ? 3.0 : 0} distance={2.5} decay={2} />

        {/* PIVOT PINTU KIRI (Engsel di sisi kiri: X = -0.465) */}
        <group ref={leftPivotRef} position={[-0.465, 1.28, -0.38]}>
          <mesh position={[0.23, 0, -0.025]} castShadow geometry={fridgeDoorTopLeftGeo} material={fridgeStainlessMat} />
          <mesh position={[0.425, 0, -0.065]} geometry={fridgeHandleVerticalGeo} material={fridgeHandleMat} />
          <mesh position={[0.23, 0.1, -0.048]} geometry={fridgeDispenserGeo} material={fridgeDispenserMat} />
          <mesh position={[0.23, 0.2, -0.059]} rotation={[0, Math.PI, 0]} geometry={fridgeDispenserLcdGeo} material={fridgeDispenserLcdMat} />
        </group>

        {/* PIVOT PINTU KANAN (Engsel di sisi kanan: X = +0.465) */}
        <group ref={rightPivotRef} position={[0.465, 1.28, -0.38]}>
          <mesh position={[-0.23, 0, -0.025]} castShadow geometry={fridgeDoorTopRightGeo} material={fridgeStainlessMat} />
          <mesh position={[-0.425, 0, -0.065]} geometry={fridgeHandleVerticalGeo} material={fridgeHandleMat} />
          <mesh position={[-0.245, 0.27, -0.052]} geometry={fridgeStickyYellowGeo} material={fridgeStickyYellowMat} />
          <mesh position={[-0.245, 0.33, -0.056]} rotation={[Math.PI / 2, 0, 0]} geometry={fridgeMagnetGeo} material={fridgeMagnetMat} />
          <mesh position={[-0.125, 0.14, -0.052]} geometry={fridgeStickyPinkGeo} material={fridgeStickyPinkMat} />
        </group>

        {/* Laci Freezer Bawah (Tetap di posisi bawah) */}
        <mesh position={[0, 0.36, -0.405]} castShadow geometry={fridgeDoorBottomGeo} material={fridgeStainlessMat} />
        <mesh position={[0, 0.62, -0.445]} geometry={fridgeHandleHorizontalGeo} material={fridgeHandleMat} />
      </group>
    </RigidBody>
  );
});

// Geometri & Material bersama untuk CoffeeMachine
const coffeeMachineBodyGeo = new THREE.BoxGeometry(0.48, 0.44, 0.42);
const coffeeMachineFasciaGeo = new THREE.BoxGeometry(0.44, 0.40, 0.02);
const coffeeMachineHopperGeo = new THREE.CylinderGeometry(0.10, 0.08, 0.12, 16);
const coffeeMachineBeansGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.09, 14);
const coffeeMachineLidGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.015, 16);
const coffeeMachineCupTrayGeo = new THREE.BoxGeometry(0.22, 0.01, 0.28);
const coffeeMachineCupGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.065, 16);
const coffeeMachineLcdGeo = new THREE.PlaneGeometry(0.22, 0.08);
const coffeeMachineSpoutGeo = new THREE.BoxGeometry(0.12, 0.04, 0.06);
const coffeeMachineNozzleGeo = new THREE.CylinderGeometry(0.007, 0.005, 0.04, 8);
const coffeeMachineDripGeo = new THREE.BoxGeometry(0.44, 0.04, 0.16);
const coffeeMachineGrateGeo = new THREE.BoxGeometry(0.42, 0.005, 0.14);
const coffeeMachineLiquidGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.005, 12);
const coffeeSteamGeo = new THREE.SphereGeometry(0.025, 8, 8);
const coffeeStreamStreamGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.07, 8);

const coffeeMachineBodyMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8, roughness: 0.25 });
const coffeeMachineChromeMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", metalness: 0.95, roughness: 0.1 });
const coffeeMachineHopperMat = new THREE.MeshStandardMaterial({ color: "#475569", transparent: true, opacity: 0.55, roughness: 0.1 });
const coffeeMachineBeansMat = new THREE.MeshStandardMaterial({ color: "#3e1c08", roughness: 0.8 });
const coffeeMachineLcdMat = new THREE.MeshBasicMaterial({ color: "#0284c7" });
const coffeeMachineLcdBrewMat = new THREE.MeshBasicMaterial({ color: "#ea580c" });
const coffeeCupMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.2 });
const coffeeLiquidMat = new THREE.MeshStandardMaterial({ color: "#271206", roughness: 0.1 });
const coffeeSteamMat = new THREE.MeshBasicMaterial({ color: "#f1f5f9", transparent: true, opacity: 0.45 });

// Audio feedback penyeduhan espresso
function playCoffeeBrewSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // 1. Motor grinder biji kopi
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);

    // 2. Pompa espresso & uap panas
    const pumpOsc = ctx.createOscillator();
    const pumpGain = ctx.createGain();
    pumpOsc.type = 'triangle';
    pumpOsc.frequency.setValueAtTime(260, ctx.currentTime + 0.6);
    pumpOsc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.8);
    pumpGain.gain.setValueAtTime(0.01, ctx.currentTime);
    pumpGain.gain.setValueAtTime(0.12, ctx.currentTime + 0.6);
    pumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
    pumpOsc.connect(pumpGain);
    pumpGain.connect(ctx.destination);
    pumpOsc.start(ctx.currentTime + 0.6);
    pumpOsc.stop(ctx.currentTime + 2.2);

    // 3. Completion chime
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(880, ctx.currentTime + 2.3);
    chimeOsc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 2.4);
    chimeGain.gain.setValueAtTime(0.01, ctx.currentTime);
    chimeGain.gain.setValueAtTime(0.14, ctx.currentTime + 2.3);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);
    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chimeOsc.start(ctx.currentTime + 2.3);
    chimeOsc.stop(ctx.currentTime + 2.9);
  } catch (err) {}
}

// Komponen Mesin Kopi Espresso Modern Komersial dengan Animasi Uap, Aliran Kopi, & Suara
const CoffeeMachine = React.memo(({ position, rotation = [0, 0, 0], isBrewing: externalIsBrewing, onBrew: externalOnBrew }) => {
  const [internalBrewing, setInternalBrewing] = useState(false);
  const brewing = externalIsBrewing !== undefined ? externalIsBrewing : internalBrewing;
  const steamGroupRef = useRef();
  const streamRef = useRef();
  const liquidRef = useRef();
  const lastBrewRef = useRef(false);

  useEffect(() => {
    if (brewing && !lastBrewRef.current) {
      lastBrewRef.current = true;
      playCoffeeBrewSound();
    } else if (!brewing) {
      lastBrewRef.current = false;
    }
  }, [brewing]);

  const handleClick = (e) => {
    e.stopPropagation();
    if (externalOnBrew) {
      externalOnBrew();
    } else {
      setInternalBrewing(true);
      setTimeout(() => setInternalBrewing(false), 4500);
    }
  };

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (steamGroupRef.current) {
      if (brewing) {
        steamGroupRef.current.visible = true;
        steamGroupRef.current.position.y = 0.15 + (Math.sin(time * 8) * 0.025);
        steamGroupRef.current.scale.setScalar(1 + Math.sin(time * 6) * 0.35);
      } else {
        steamGroupRef.current.visible = false;
      }
    }
    if (streamRef.current) {
      streamRef.current.visible = brewing;
      if (brewing) {
        streamRef.current.scale.y = 0.8 + Math.sin(time * 15) * 0.2;
      }
    }
    if (liquidRef.current) {
      const targetScaleY = brewing ? 1.0 : 0.7;
      liquidRef.current.scale.y = THREE.MathUtils.damp(liquidRef.current.scale.y, targetScaleY, 3.0, delta);
    }
  });

  return (
    <group 
      position={position} 
      rotation={rotation} 
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Body Mesin Kopi */}
      <mesh position={[0, 0.22, 0]} castShadow geometry={coffeeMachineBodyGeo} material={coffeeMachineBodyMat} />
      {/* Fascia Depan Chrome */}
      <mesh position={[0, 0.22, -0.21]} geometry={coffeeMachineFasciaGeo} material={coffeeMachineChromeMat} />
      {/* Hopper Biji Kopi Transparan di Atas (Sisi Kiri) */}
      <mesh position={[-0.11, 0.49, 0]} geometry={coffeeMachineHopperGeo} material={coffeeMachineHopperMat} />
      <mesh position={[-0.11, 0.47, 0]} geometry={coffeeMachineBeansGeo} material={coffeeMachineBeansMat} />
      <mesh position={[-0.11, 0.555, 0]} geometry={coffeeMachineLidGeo} material={coffeeMachineChromeMat} />
      {/* Cup Warmer Tray di Atas (Sisi Kanan) dengan 2 Cangkir Espresso Keramik */}
      <mesh position={[0.11, 0.445, 0]} geometry={coffeeMachineCupTrayGeo} material={coffeeMachineChromeMat} />
      <mesh position={[0.07, 0.48, -0.05]} geometry={coffeeMachineCupGeo} material={coffeeCupMat} />
      <mesh position={[0.15, 0.48, 0.05]} geometry={coffeeMachineCupGeo} material={coffeeCupMat} />
      {/* Layar Sentuh LCD Digital ("COFFEE READY" / "BREWING") */}
      <mesh 
        position={[0, 0.33, -0.222]} 
        rotation={[0, Math.PI, 0]} 
        geometry={coffeeMachineLcdGeo} 
        material={brewing ? coffeeMachineLcdBrewMat : coffeeMachineLcdMat} 
      />
      <Text position={[0, 0.33, -0.225]} rotation={[0, Math.PI, 0]} fontSize={0.032} color="#ffffff" fontWeight="bold">
        {brewing ? "BREWING..." : "ESPRESSO // READY"}
      </Text>
      {/* Dual Chrome Spout Penyalur Kopi */}
      <mesh position={[0, 0.23, -0.23]} geometry={coffeeMachineSpoutGeo} material={coffeeMachineChromeMat} />
      <mesh position={[-0.025, 0.19, -0.23]} geometry={coffeeMachineNozzleGeo} material={coffeeMachineChromeMat} />
      <mesh position={[0.025, 0.19, -0.23]} geometry={coffeeMachineNozzleGeo} material={coffeeMachineChromeMat} />
      {/* Aliran Kopi Hangat Saat Diseduh */}
      <mesh ref={streamRef} position={[0, 0.14, -0.23]} geometry={coffeeStreamStreamGeo} material={coffeeLiquidMat} visible={false} />
      {/* Drip Tray Bawah */}
      <mesh position={[0, 0.02, -0.27]} geometry={coffeeMachineDripGeo} material={coffeeMachineBodyMat} />
      <mesh position={[0, 0.042, -0.27]} geometry={coffeeMachineGrateGeo} material={coffeeMachineChromeMat} />
      {/* Cangkir Kopi Aktif di Bawah Spout */}
      <mesh position={[0, 0.075, -0.24]} geometry={coffeeMachineCupGeo} material={coffeeCupMat} />
      <mesh ref={liquidRef} position={[0, 0.105, -0.24]} geometry={coffeeMachineLiquidGeo} material={coffeeLiquidMat} />
      {/* Uap Hangat Halus di Atas Cangkir (Animasi saat brewing) */}
      <group ref={steamGroupRef} position={[0, 0.15, -0.24]} visible={false}>
        <mesh position={[-0.02, 0, 0]} geometry={coffeeSteamGeo} material={coffeeSteamMat} />
        <mesh position={[0.02, 0.02, 0]} geometry={coffeeSteamGeo} material={coffeeSteamMat} />
        <mesh position={[0, 0.04, 0]} geometry={coffeeSteamGeo} material={coffeeSteamMat} />
      </group>
    </group>
  );
});

// Geometri & Material bersama untuk Kloset Toilet Modern (Modern Water Closet)
const toiletPorcelainMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.12, metalness: 0.05 });
const toiletSeatMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.22, metalness: 0.02 });
const toiletWaterMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.85 });
const toiletInnerBowlMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.25, metalness: 0.05 });
const toiletChromeMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.1, metalness: 0.95 });
const toiletPaperMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, metalness: 0.0 });
const toiletPaperCoreMat = new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.8, metalness: 0.0 });
const toiletRubberMat = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8, metalness: 0.1 });

// Geometri Reusable Kloset Duduk
const toiletPedestalGeo = new THREE.CylinderGeometry(0.20, 0.24, 0.10, 20);
const toiletStemGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.20, 20);
const toiletOuterBowlGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.18, 20);
const toiletInnerBowlGeo = new THREE.CylinderGeometry(0.17, 0.10, 0.14, 20);
const toiletWaterGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.01, 16);
const toiletSeatRingGeo = new THREE.TorusGeometry(0.17, 0.035, 10, 24);
const toiletLidGeo = new THREE.BoxGeometry(0.34, 0.40, 0.025);
const toiletHingeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.04, 12);
const toiletTankGeo = new THREE.BoxGeometry(0.42, 0.40, 0.20);
const toiletTankLidGeo = new THREE.BoxGeometry(0.45, 0.04, 0.22);
const toiletFlushBezelGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.012, 16);
const toiletFlushButtonGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.014, 12);
const toiletPipeGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.28, 8);
const toiletValveGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.025, 12);

// Aksesoris Toilet Reusable
const toiletSprayHandleGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.10, 8);
const toiletSprayHoseGeo = new THREE.TorusGeometry(0.08, 0.008, 6, 16, Math.PI);
const toiletPaperRodGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8);
const toiletPaperMountGeo = new THREE.BoxGeometry(0.015, 0.06, 0.04);
const toiletPaperRollGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16);
const toiletPaperCoreGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.125, 12);
const toiletPaperSheetGeo = new THREE.BoxGeometry(0.002, 0.10, 0.11);
const toiletTrashBodyGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.28, 16);
const toiletTrashLidGeo = new THREE.CylinderGeometry(0.105, 0.105, 0.02, 16);
const toiletTrashPedalGeo = new THREE.BoxGeometry(0.04, 0.015, 0.06);
const toiletBrushCanGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.22, 14);
const toiletBrushHandleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.20, 8);
const toiletMatGeo = new THREE.BoxGeometry(0.55, 0.008, 0.50);

// Bilik Toilet dengan Kloset Duduk Modern Realistis & Aksesoris Lengkap
const ToiletCubicle = React.memo(({ position }) => (
  <RigidBody 
    type="fixed" 
    colliders={false} 
    position={position}
  >
    {/* Collider Rapier untuk Kloset */}
    <CuboidCollider args={[0.35, 0.45, 0.45]} position={[0, 0.45, 0]} />

    <group>
      {/* 1. Base / Pedestal Kaki Kloset */}
      <mesh 
        position={[0, 0.05, 0.02]} 
        scale={[1.0, 1.0, 1.35]} 
        geometry={toiletPedestalGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />
      <mesh 
        position={[0, 0.20, 0.02]} 
        scale={[0.92, 1.0, 1.3]} 
        geometry={toiletStemGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />

      {/* 2. Mangkuk Kloset (Bowl), Cekungan Dalam & Permukaan Air */}
      <mesh 
        position={[0, 0.35, -0.06]} 
        scale={[1.0, 1.0, 1.35]} 
        geometry={toiletOuterBowlGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />
      <mesh 
        position={[0, 0.37, -0.07]} 
        scale={[0.92, 1.0, 1.25]} 
        geometry={toiletInnerBowlGeo} 
        material={toiletInnerBowlMat} 
      />
      <mesh 
        position={[0, 0.32, -0.07]} 
        scale={[0.9, 1.0, 1.1]} 
        geometry={toiletWaterGeo} 
        material={toiletWaterMat} 
      />

      {/* 3. Dudukan Kloset (Seat Ring) */}
      <mesh 
        position={[0, 0.44, -0.07]} 
        rotation={[Math.PI / 2, 0, 0]} 
        scale={[0.95, 1.30, 0.45]} 
        geometry={toiletSeatRingGeo} 
        material={toiletSeatMat} 
        castShadow 
      />

      {/* 4. Tutup Kloset (Lid / Cover) bersandar ke tangki air */}
      <mesh 
        position={[0, 0.62, 0.10]} 
        rotation={[-0.15, 0, 0]} 
        geometry={toiletLidGeo} 
        material={toiletSeatMat} 
        castShadow 
      />
      {/* Engsel Tutup Kloset (Chrome Hinges) */}
      <mesh 
        position={[-0.10, 0.44, 0.08]} 
        rotation={[0, 0, Math.PI / 2]} 
        geometry={toiletHingeGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[0.10, 0.44, 0.08]} 
        rotation={[0, 0, Math.PI / 2]} 
        geometry={toiletHingeGeo} 
        material={toiletChromeMat} 
      />

      {/* 5. Tangki Air (Cistern / Flush Tank) & Tutup Tangki */}
      <mesh 
        position={[0, 0.64, 0.21]} 
        geometry={toiletTankGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />
      <mesh 
        position={[0, 0.85, 0.21]} 
        geometry={toiletTankLidGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />

      {/* Tombol Dual-Flush Chrome di Atas Tangki */}
      <mesh 
        position={[0, 0.875, 0.21]} 
        geometry={toiletFlushBezelGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[-0.011, 0.878, 0.21]} 
        geometry={toiletFlushButtonGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[0.011, 0.878, 0.21]} 
        geometry={toiletFlushButtonGeo} 
        material={toiletChromeMat} 
      />

      {/* 6. Pipa Masuk Air & Stop Kran Chrome */}
      <mesh 
        position={[-0.17, 0.28, 0.21]} 
        geometry={toiletPipeGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[-0.17, 0.14, 0.21]} 
        rotation={[Math.PI / 2, 0, 0]} 
        geometry={toiletValveGeo} 
        material={toiletChromeMat} 
      />

      {/* 7. Jet Washer / Bidet Spray Semprotan Air di Sisi Kiri */}
      <mesh 
        position={[-0.30, 0.55, 0.10]} 
        rotation={[0.2, 0, 0]} 
        geometry={toiletSprayHandleGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[-0.26, 0.38, 0.12]} 
        rotation={[0, 0, -Math.PI / 2]} 
        geometry={toiletSprayHoseGeo} 
        material={toiletChromeMat} 
      />

      {/* 8. Tempat Tisu Toilet & Gulungan Tisu di Sisi Kanan */}
      <mesh 
        position={[0.36, 0.58, 0.0]} 
        rotation={[0, 0, Math.PI / 2]} 
        geometry={toiletPaperRodGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[0.44, 0.58, 0.0]} 
        geometry={toiletPaperMountGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[0.36, 0.58, 0.0]} 
        rotation={[0, 0, Math.PI / 2]} 
        geometry={toiletPaperRollGeo} 
        material={toiletPaperMat} 
        castShadow 
      />
      <mesh 
        position={[0.36, 0.58, 0.0]} 
        rotation={[0, 0, Math.PI / 2]} 
        geometry={toiletPaperCoreGeo} 
        material={toiletPaperCoreMat} 
      />
      <mesh 
        position={[0.36, 0.48, -0.055]} 
        geometry={toiletPaperSheetGeo} 
        material={toiletPaperMat} 
      />

      {/* 9. Tempat Sampah Injak Stainless Steel */}
      <mesh 
        position={[0.42, 0.14, -0.18]} 
        geometry={toiletTrashBodyGeo} 
        material={toiletChromeMat} 
        castShadow 
      />
      <mesh 
        position={[0.42, 0.28, -0.18]} 
        geometry={toiletTrashLidGeo} 
        material={toiletChromeMat} 
      />
      <mesh 
        position={[0.42, 0.015, -0.28]} 
        geometry={toiletTrashPedalGeo} 
        material={toiletRubberMat} 
      />

      {/* 10. Wadah Sikat Kloset (Toilet Brush Stand) */}
      <mesh 
        position={[-0.36, 0.11, 0.21]} 
        geometry={toiletBrushCanGeo} 
        material={toiletPorcelainMat} 
        castShadow 
      />
      <mesh 
        position={[-0.36, 0.30, 0.21]} 
        geometry={toiletBrushHandleGeo} 
        material={toiletChromeMat} 
      />

      {/* 11. Keset Karet Anti-Slip di Depan Kloset */}
      <mesh 
        position={[0, 0.004, -0.65]} 
        geometry={toiletMatGeo} 
        material={toiletRubberMat} 
        receiveShadow 
      />
    </group>
  </RigidBody>
));

// Geometri & Material bersama untuk InfoBoard
// Geometri & Material bersama untuk InfoBoard
const infoBoardGeo = new THREE.BoxGeometry(3, 2, 0.1);
const infoBoardMat = new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.75, metalness: 0.05 });
const infoBoardHoverMat = new THREE.MeshStandardMaterial({ color: "#fef9c3", roughness: 0.75, metalness: 0.05 });

// Papan Informasi & To-Do List (Double-Sided Text agar terbaca dari segala sudut)
const InfoBoard = React.memo(({ position, rotation = [0, 0, 0], title, initialContent, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [content, setContent] = useState(initialContent || "");

  useEffect(() => {
    const loadData = () => {
      fetch('http://localhost:3000/api/infoboard')
        .then(res => res.json())
        .then(data => {
          if (data) {
            if ((title === "PENGUMUMAN" || title === "ANNOUNCEMENTS") && data.note) {
              setContent(prev => (prev === data.note ? prev : data.note));
            } else if (title === "TO-DO LIST" && data.todoList) {
              setContent(prev => (prev === data.todoList ? prev : data.todoList));
            }
          }
        })
        .catch(err => console.error("InfoBoard fetch error:", err));
    };

    loadData();
    const interval = setInterval(loadData, 10000); // 10 detik sinkronisasi
    return () => clearInterval(interval);
  }, [title]);

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick({ title, content }); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      <mesh castShadow receiveShadow position={[0, 0, 0]} geometry={infoBoardGeo} material={hovered ? infoBoardHoverMat : infoBoardMat} />
      {/* Sisi Depan (+Z) */}
      <Text position={[0, 0.7, 0.06]} fontSize={0.2} color="black" fontWeight="bold">
        {title}
      </Text>
      <Text position={[0, 0, 0.06]} fontSize={0.15} color="#374151" maxWidth={2.6} textAlign="center">
        {content}
      </Text>
      {/* Sisi Belakang (-Z / Menghadap ke dalam Ruang Staff) */}
      <Text position={[0, 0.7, -0.06]} rotation={[0, Math.PI, 0]} fontSize={0.2} color="black" fontWeight="bold">
        {title}
      </Text>
      <Text position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]} fontSize={0.15} color="#374151" maxWidth={2.6} textAlign="center">
        {content}
      </Text>
    </group>
  );
});

// Papan Nama Ruangan di Dinding
const RoomSign = React.memo(({ position, rotation = [0, 0, 0], text }) => {
  const signWidth = Math.max(1.2, text.length * 0.16); // Sesuaikan panjang papan
  const signGeo = useMemo(() => new THREE.BoxGeometry(signWidth, 0.5, 0.05), [signWidth]);

  return (
    <group position={position} rotation={rotation}>
      {/* Papan Akrilik */}
      <mesh position={[0, 0, 0.025]} geometry={signGeo}>
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.25}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {text}
      </Text>
    </group>
  );
});

// Geometri & Material bersama untuk NeonBox
const neonBoxCaseGeo = new THREE.BoxGeometry(3.2, 1.1, 0.12);
const neonBoxBezelGeo = new THREE.BoxGeometry(3.26, 1.16, 0.015);
const neonBoxPanelGeo = new THREE.PlaneGeometry(3.15, 1.05);
const neonBoxStripeGeo = new THREE.PlaneGeometry(2.7, 0.018);

const neonBoxCaseMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8, roughness: 0.25 });
const neonBoxBezelMat = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.9, roughness: 0.2 });
const neonBoxPanelMat = new THREE.MeshStandardMaterial({ color: "#090d16", roughness: 0.15, metalness: 0.1 });
const neonBoxStripeOnMat = new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false });
const neonBoxStripeOffMat = new THREE.MeshBasicMaterial({ color: "#334155", toneMapped: false });

// Neonbox Perusahaan "pandekode" (Backlit Acrylic Frame dengan Typography Glowing)
const NeonBox = React.memo(({ position, rotation = [0, 0, 0], screenMult = 1.0, isLightOn = true }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Casing Belakang & Samping Neonbox (Matte Dark Box) */}
      <mesh position={[0, 0, 0.05]} castShadow geometry={neonBoxCaseGeo} material={neonBoxCaseMat} />

      {/* Bezel Frame Metalik Elegan */}
      <mesh position={[0, 0, 0.105]} geometry={neonBoxBezelGeo} material={neonBoxBezelMat} />

      {/* Panel Depan Akrilik Hitam Glossy */}
      <mesh position={[0, 0, 0.11]} geometry={neonBoxPanelGeo} material={neonBoxPanelMat} />

      {/* Garis Aksen Neon Cyan Atas & Bawah */}
      <mesh 
        position={[0, 0.4, 0.115]} 
        geometry={neonBoxStripeGeo} 
        material={isLightOn ? neonBoxStripeOnMat : neonBoxStripeOffMat} 
      />
      <mesh 
        position={[0, -0.4, 0.115]} 
        geometry={neonBoxStripeGeo} 
        material={isLightOn ? neonBoxStripeOnMat : neonBoxStripeOffMat} 
      />

      {/* Tulisan Neon Utama "pandekode" */}
      <Text
        position={[0, 0.04, 0.12]}
        fontSize={0.42}
        color={isLightOn ? "#ffffff" : "#64748b"}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        letterSpacing={0.06}
      >
        pandekode
        <meshStandardMaterial
          color="#ffffff"
          emissive={isLightOn ? "#38bdf8" : "#000000"}
          emissiveIntensity={isLightOn ? 3.5 * screenMult : 0}
          toneMapped={false}
        />
      </Text>

      {/* Sub-text Branding */}
      <Text
        position={[0, -0.22, 0.12]}
        fontSize={0.10}
        color={isLightOn ? "#7dd3fc" : "#475569"}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        fontWeight="bold"
      >
        SOFTWARE & AI STUDIO
        <meshStandardMaterial
          color={isLightOn ? "#7dd3fc" : "#475569"}
          emissive={isLightOn ? "#0284c7" : "#000000"}
          emissiveIntensity={isLightOn ? 2.0 * screenMult : 0}
          toneMapped={false}
        />
      </Text>

      {/* Cahaya Pendaran Neon Asli Menerangi Dinding & Meja Lobi */}
      {isLightOn && (
        <pointLight
          position={[0, 0, 0.35]}
          intensity={1.2 * screenMult}
          distance={4.5}
          decay={2}
          color="#38bdf8"
        />
      )}
    </group>
  );
});

// Geometri & Material bersama untuk PottedPlant
const pottedPlantPotGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.8);
const pottedPlantFoliageGeo = new THREE.SphereGeometry(0.7, 16, 16);
const pottedPlantLowFoliageGeo = new THREE.OctahedronGeometry(0.7, 0);
const pottedPlantPotMat = new THREE.MeshStandardMaterial({ color: "#92400e" });
const pottedPlantFoliageMat = new THREE.MeshStandardMaterial({ color: "#166534" });

// Dekorasi Tanaman Luar dengan LOD
const PottedPlant = React.memo(({ position }) => (
  <group position={position}>
    <Detailed distances={[0, 16]}>
      {/* LOD 0: High Detail (< 16m) */}
      <group>
        <mesh position={[0, 0.4, 0]} castShadow geometry={pottedPlantPotGeo} material={pottedPlantPotMat} />
        <mesh position={[0, 1.3, 0]} castShadow geometry={pottedPlantFoliageGeo} material={pottedPlantFoliageMat} />
      </group>
      {/* LOD 1: Low Detail (>= 16m) */}
      <group>
        <mesh position={[0, 0.4, 0]} geometry={pottedPlantPotGeo} material={pottedPlantPotMat} />
        <mesh position={[0, 1.3, 0]} geometry={pottedPlantLowFoliageGeo} material={pottedPlantFoliageMat} />
      </group>
    </Detailed>
  </group>
));

// ============================================================================
// GEOMETRI & MATERIAL BERSAMA UNTUK KENDARAAN (MPV TOYOTA AVANZA & SKUTER MATIK HONDA VARIO)
// Model Low-Poly Ikonik Indonesia, seluruh geometri & material diinstansiasi 1x di level modul
// ============================================================================

// Material bersama untuk Kendaraan (PBR Metallic & Automotive Finishes)
const carTireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.85, metalness: 0.1 });
const carRimMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.25, metalness: 0.85 });
const carChromeMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.15, metalness: 0.95 });
const carGlassMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
const carChassisMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.7, metalness: 0.3 });
const carHeadlightMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 1.8, toneMapped: false });
const carTaillightMat = new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#dc2626", emissiveIntensity: 2.0, toneMapped: false });
const carPlateMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.4 });
const carMirrorGlassMat = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.1, metalness: 0.95 });

// Material bersama untuk Motor Skutik (Honda Vario)
const motoEngineMat = new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.5, metalness: 0.7 });
const motoSeatMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.75, metalness: 0.05 });
const motoChromeMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.15, metalness: 0.9 });
const motoGripMat = new THREE.MeshStandardMaterial({ color: "#09090b", roughness: 0.9 });
const motoScreenMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.15, metalness: 0.8, transparent: true, opacity: 0.8 });
const motoAmberMat = new THREE.MeshStandardMaterial({ color: "#f59e0b", emissive: "#d97706", emissiveIntensity: 1.2, toneMapped: false });

// Geometri bersama untuk MPV (Toyota Avanza)
const avanzaChassisGeo = new THREE.BoxGeometry(1.64, 0.22, 4.20);
const avanzaBodyLowerGeo = new THREE.BoxGeometry(1.76, 0.52, 4.30);
const avanzaHoodGeo = new THREE.BoxGeometry(1.66, 0.16, 1.25);
const avanzaHoodCreaseGeo = new THREE.BoxGeometry(0.85, 0.04, 1.20);
const avanzaGrilleGeo = new THREE.BoxGeometry(1.16, 0.32, 0.08);
const avanzaChromeBarGeo = new THREE.BoxGeometry(1.40, 0.06, 0.04);
const avanzaHeadlightGeo = new THREE.BoxGeometry(0.36, 0.14, 0.08);
const avanzaSkidPlateGeo = new THREE.BoxGeometry(1.20, 0.08, 0.12);
const avanzaWindshieldGeo = new THREE.BoxGeometry(1.46, 0.04, 0.95);
const avanzaRoofGeo = new THREE.BoxGeometry(1.48, 0.06, 2.50);
const avanzaRoofRailGeo = new THREE.BoxGeometry(0.04, 0.04, 2.10);
const avanzaSharkFinGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
const avanzaRearGlassGeo = new THREE.BoxGeometry(1.44, 0.04, 0.68);
const avanzaTailgateGeo = new THREE.BoxGeometry(1.74, 0.54, 0.14);
const avanzaSpoilerGeo = new THREE.BoxGeometry(1.52, 0.08, 0.28);
const avanzaSideGlassGeo = new THREE.BoxGeometry(0.04, 0.48, 2.40);
const avanzaPillarGeo = new THREE.BoxGeometry(1.50, 0.48, 0.08);
const avanzaTaillightGeo = new THREE.BoxGeometry(0.32, 0.16, 0.06);
const avanzaTaillightStripGeo = new THREE.BoxGeometry(0.96, 0.04, 0.04);
const avanzaRearBumperGeo = new THREE.BoxGeometry(1.72, 0.24, 0.12);
const avanzaExhaustTipGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 10);
const avanzaPlateGeo = new THREE.BoxGeometry(0.42, 0.12, 0.04);
const avanzaMirrorStemGeo = new THREE.BoxGeometry(0.12, 0.03, 0.03);
const avanzaMirrorHousingGeo = new THREE.BoxGeometry(0.18, 0.12, 0.08);
const avanzaMirrorGlassGeo = new THREE.BoxGeometry(0.02, 0.10, 0.06);
const avanzaTireGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.20, 16);
const avanzaRimDiscGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.21, 14);
const avanzaRimSpokeGeo = new THREE.BoxGeometry(0.36, 0.214, 0.04);

// Geometri bersama untuk Skuter Matik (Honda Vario)
const varioFloorboardGeo = new THREE.BoxGeometry(0.38, 0.06, 0.44);
const varioInnerShieldGeo = new THREE.BoxGeometry(0.32, 0.38, 0.14);
const varioFrontCowlGeo = new THREE.BoxGeometry(0.36, 0.44, 0.32);
const varioNoseGeo = new THREE.BoxGeometry(0.24, 0.28, 0.22);
const varioHeadlightGeo = new THREE.BoxGeometry(0.12, 0.08, 0.04);
const varioDrlGeo = new THREE.BoxGeometry(0.10, 0.03, 0.03);
const varioFenderGeo = new THREE.BoxGeometry(0.14, 0.06, 0.36);
const varioHeadCoverGeo = new THREE.BoxGeometry(0.30, 0.16, 0.18);
const varioVisorGeo = new THREE.BoxGeometry(0.18, 0.10, 0.02);
const varioSpeedoGeo = new THREE.BoxGeometry(0.14, 0.03, 0.08);
const varioHandlebarGeo = new THREE.BoxGeometry(0.66, 0.025, 0.025);
const varioGripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.10, 8);
const varioMirrorStemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6);
const varioMirrorHeadGeo = new THREE.BoxGeometry(0.09, 0.06, 0.02);
const varioSidePanelGeo = new THREE.BoxGeometry(0.34, 0.36, 0.72);
const varioSeatGeo = new THREE.BoxGeometry(0.30, 0.10, 0.74);
const varioGrabRailGeo = new THREE.BoxGeometry(0.24, 0.04, 0.16);
const varioTailCowlGeo = new THREE.BoxGeometry(0.26, 0.20, 0.38);
const varioTaillightGeo = new THREE.BoxGeometry(0.18, 0.08, 0.04);
const varioRearFenderGeo = new THREE.BoxGeometry(0.12, 0.22, 0.16);
const varioPlateGeo = new THREE.BoxGeometry(0.14, 0.10, 0.02);
const varioCvtGeo = new THREE.BoxGeometry(0.12, 0.16, 0.52);
const varioAirFilterGeo = new THREE.BoxGeometry(0.10, 0.12, 0.28);
const varioExhaustGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.52, 10);
const varioExhaustShieldGeo = new THREE.BoxGeometry(0.04, 0.12, 0.36);
const varioKickstandGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6);
const varioTireFrontGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.10, 16);
const varioRimFrontGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.105, 12);
const varioDiscFrontGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.11, 10);
const varioTireRearGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.13, 16);
const varioRimRearGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.135, 12);
const varioRimSpokeGeo = new THREE.BoxGeometry(0.30, 0.11, 0.02);
const varioRimSpokeRearGeo = new THREE.BoxGeometry(0.30, 0.14, 0.02);

// Kendaraan MPV 7-Seater Modern (Model Khas Toyota Avanza) dengan LOD
const SimpleCar = React.memo(({ position, rotation = [0, 0, 0], color = "#2563eb" }) => {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.85, 
    roughness: 0.25,
    envMapIntensity: 1.2 
  }), [color]);

  return (
    <group position={position} rotation={rotation}>
      <Detailed distances={[0, 16]}>
        {/* LOD 0: MPV Avanza Lengkap (< 16m) */}
        <group>
          {/* 1. Sasis Bawah & Ground Clearance Tinggi Khas MPV */}
          <mesh position={[0, 0.22, 0]} geometry={avanzaChassisGeo} material={carChassisMat} />
          {/* 2. Bodi Utama MPV */}
          <mesh position={[0, 0.54, 0]} castShadow geometry={avanzaBodyLowerGeo} material={bodyMat} />
          {/* 3. Kap Mesin Aerodinamis (Hood) & Lekukan Tengah */}
          <mesh position={[0, 0.84, 1.25]} castShadow geometry={avanzaHoodGeo} material={bodyMat} />
          <mesh position={[0, 0.91, 1.25]} geometry={avanzaHoodCreaseGeo} material={bodyMat} />

          {/* 4. Fascia Depan Avanza: Grille Trapesium Besar, Bar Krom Atas, Lampu LED Dual-Tier, Skid Plate & Plat Nomor */}
          <mesh position={[0, 0.54, 2.16]} geometry={avanzaGrilleGeo} material={carChassisMat} />
          <mesh position={[0, 0.72, 2.16]} geometry={avanzaChromeBarGeo} material={carChromeMat} />
          <mesh position={[-0.62, 0.68, 2.14]} geometry={avanzaHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[0.62, 0.68, 2.14]} geometry={avanzaHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[0, 0.24, 2.12]} geometry={avanzaSkidPlateGeo} material={carChromeMat} />
          <mesh position={[0, 0.38, 2.18]} geometry={avanzaPlateGeo} material={carPlateMat} />

          {/* 5. Kabin MPV Panjang 3-Baris: Kaca Depan Curam, Atap Panjang, Roof Rail & Antena Shark Fin */}
          <mesh position={[0, 1.22, 0.58]} rotation={[-0.64, 0, 0]} geometry={avanzaWindshieldGeo} material={carGlassMat} />
          <mesh position={[0, 1.62, -0.65]} castShadow geometry={avanzaRoofGeo} material={bodyMat} />
          {/* Roof Rail Kiri & Kanan */}
          <mesh position={[-0.68, 1.67, -0.65]} geometry={avanzaRoofRailGeo} material={carChassisMat} />
          <mesh position={[0.68, 1.67, -0.65]} geometry={avanzaRoofRailGeo} material={carChassisMat} />
          <mesh position={[0, 1.70, -1.65]} geometry={avanzaSharkFinGeo} material={carChassisMat} />

          {/* 6. Jendela Samping 3-Baris dengan Pilar B & C Hitam */}
          <mesh position={[-0.74, 1.24, -0.65]} geometry={avanzaSideGlassGeo} material={carGlassMat} />
          <mesh position={[0.74, 1.24, -0.65]} geometry={avanzaSideGlassGeo} material={carGlassMat} />
          <mesh position={[0, 1.24, 0.05]} geometry={avanzaPillarGeo} material={carChassisMat} />
          <mesh position={[0, 1.24, -0.85]} geometry={avanzaPillarGeo} material={carChassisMat} />

          {/* 7. Pintu Bagasi Belakang Tegak (Tailgate MPV), Spoiler & Kaca Belakang */}
          <mesh position={[0, 1.26, -1.98]} rotation={[0.22, 0, 0]} geometry={avanzaRearGlassGeo} material={carGlassMat} />
          <mesh position={[0, 0.68, -2.14]} castShadow geometry={avanzaTailgateGeo} material={bodyMat} />
          <mesh position={[0, 1.63, -1.95]} geometry={avanzaSpoilerGeo} material={bodyMat} />

          {/* 8. Lampu Belakang LED L-Shape Avanza, Reflektor Horizontal, Diffuser & Plat Nomor */}
          <mesh position={[-0.66, 0.82, -2.16]} geometry={avanzaTaillightGeo} material={carTaillightMat} />
          <mesh position={[0.66, 0.82, -2.16]} geometry={avanzaTaillightGeo} material={carTaillightMat} />
          <mesh position={[0, 0.84, -2.17]} geometry={avanzaTaillightStripGeo} material={carTaillightMat} />
          <mesh position={[0, 0.50, -2.17]} geometry={avanzaPlateGeo} material={carPlateMat} />
          <mesh position={[0, 0.26, -2.12]} geometry={avanzaRearBumperGeo} material={carChassisMat} />
          <mesh position={[0.55, 0.20, -2.14]} rotation={[Math.PI / 2, 0, 0]} geometry={avanzaExhaustTipGeo} material={carChromeMat} />

          {/* 9. Spion Samping MPV dengan Lampu Sein */}
          <group position={[-0.92, 1.08, 0.65]}>
            <mesh geometry={avanzaMirrorStemGeo} material={carChassisMat} />
            <mesh position={[-0.05, 0.02, 0]} geometry={avanzaMirrorHousingGeo} material={bodyMat} />
            <mesh position={[-0.05, 0.02, -0.04]} geometry={avanzaMirrorGlassGeo} material={carMirrorGlassMat} />
          </group>
          <group position={[0.92, 1.08, 0.65]}>
            <mesh geometry={avanzaMirrorStemGeo} material={carChassisMat} />
            <mesh position={[0.05, 0.02, 0]} geometry={avanzaMirrorHousingGeo} material={bodyMat} />
            <mesh position={[0.05, 0.02, -0.04]} geometry={avanzaMirrorGlassGeo} material={carMirrorGlassMat} />
          </group>

          {/* 10. 4 Roda Alloy MPV 16-Inch */}
          {/* Roda Depan Kiri */}
          <group position={[-0.86, 0.33, 1.35]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={avanzaTireGeo} material={carTireMat} castShadow />
            <mesh geometry={avanzaRimDiscGeo} material={carRimMat} />
            <mesh geometry={avanzaRimSpokeGeo} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, Math.PI / 3, 0]} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, -Math.PI / 3, 0]} material={carChromeMat} />
          </group>
          {/* Roda Depan Kanan */}
          <group position={[0.86, 0.33, 1.35]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={avanzaTireGeo} material={carTireMat} castShadow />
            <mesh geometry={avanzaRimDiscGeo} material={carRimMat} />
            <mesh geometry={avanzaRimSpokeGeo} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, Math.PI / 3, 0]} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, -Math.PI / 3, 0]} material={carChromeMat} />
          </group>
          {/* Roda Belakang Kiri */}
          <group position={[-0.86, 0.33, -1.35]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={avanzaTireGeo} material={carTireMat} castShadow />
            <mesh geometry={avanzaRimDiscGeo} material={carRimMat} />
            <mesh geometry={avanzaRimSpokeGeo} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, Math.PI / 3, 0]} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, -Math.PI / 3, 0]} material={carChromeMat} />
          </group>
          {/* Roda Belakang Kanan */}
          <group position={[0.86, 0.33, -1.35]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={avanzaTireGeo} material={carTireMat} castShadow />
            <mesh geometry={avanzaRimDiscGeo} material={carRimMat} />
            <mesh geometry={avanzaRimSpokeGeo} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, Math.PI / 3, 0]} material={carChromeMat} />
            <mesh geometry={avanzaRimSpokeGeo} rotation={[0, -Math.PI / 3, 0]} material={carChromeMat} />
          </group>
        </group>

        {/* LOD 1: Siluet Streamlined MPV (Jarak Jauh >= 16m) */}
        <group>
          <mesh position={[0, 0.54, 0]} geometry={avanzaBodyLowerGeo} material={bodyMat} />
          <mesh position={[0, 0.84, 1.25]} geometry={avanzaHoodGeo} material={bodyMat} />
          <mesh position={[0, 1.22, 0.58]} rotation={[-0.64, 0, 0]} geometry={avanzaWindshieldGeo} material={carGlassMat} />
          <mesh position={[0, 1.62, -0.65]} geometry={avanzaRoofGeo} material={bodyMat} />
          <mesh position={[0, 0.68, -2.14]} geometry={avanzaTailgateGeo} material={bodyMat} />
          <mesh position={[0, 0.54, 2.16]} geometry={avanzaGrilleGeo} material={carChassisMat} />
          <mesh position={[-0.62, 0.68, 2.14]} geometry={avanzaHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[0.62, 0.68, 2.14]} geometry={avanzaHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[-0.66, 0.82, -2.16]} geometry={avanzaTaillightGeo} material={carTaillightMat} />
          <mesh position={[0.66, 0.82, -2.16]} geometry={avanzaTaillightGeo} material={carTaillightMat} />
          {/* 4 Roda Siluet */}
          <mesh position={[-0.86, 0.33, 1.35]} rotation={[0, 0, Math.PI / 2]} geometry={avanzaTireGeo} material={carTireMat} />
          <mesh position={[0.86, 0.33, 1.35]} rotation={[0, 0, Math.PI / 2]} geometry={avanzaTireGeo} material={carTireMat} />
          <mesh position={[-0.86, 0.33, -1.35]} rotation={[0, 0, Math.PI / 2]} geometry={avanzaTireGeo} material={carTireMat} />
          <mesh position={[0.86, 0.33, -1.35]} rotation={[0, 0, Math.PI / 2]} geometry={avanzaTireGeo} material={carTireMat} />
        </group>
      </Detailed>
    </group>
  );
});

// Kendaraan Skuter Matik Modern (Model Khas Honda Vario 160 / 125) dengan Dek Rata & LOD
const SimpleMotorcycle = React.memo(({ position, rotation = [0, 0, 0], color = "#fbbf24" }) => {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color, 
    metalness: 0.82, 
    roughness: 0.28, 
    envMapIntensity: 1.1 
  }), [color]);

  return (
    <group position={position} rotation={rotation}>
      <Detailed distances={[0, 14]}>
        {/* LOD 0: Skuter Matik Vario Lengkap (< 14m) */}
        <group>
          {/* 1. Dek Pijakan Kaki Rata Khas Skutik (Flat Floorboard) & Konsol Depan */}
          <mesh position={[0, 0.28, 0.12]} geometry={varioFloorboardGeo} material={motoGripMat} castShadow />
          <mesh position={[0, 0.50, 0.36]} geometry={varioInnerShieldGeo} material={carChassisMat} />

          {/* 2. Dada / Fairing Depan V-Shape Khas Honda Vario & Spakbor Depan */}
          <mesh position={[0, 0.68, 0.52]} geometry={varioFrontCowlGeo} material={bodyMat} castShadow />
          <mesh position={[0, 0.52, 0.64]} geometry={varioNoseGeo} material={bodyMat} />
          <mesh position={[0, 0.40, 0.76]} geometry={varioFenderGeo} material={bodyMat} />

          {/* 3. Lampu Depan LED V-Shape & Alis DRL Khas Vario */}
          <mesh position={[-0.10, 0.60, 0.68]} rotation={[0, -0.2, -0.2]} geometry={varioHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[0.10, 0.60, 0.68]} rotation={[0, 0.2, 0.2]} geometry={varioHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[-0.11, 0.72, 0.64]} geometry={varioDrlGeo} material={carHeadlightMat} />
          <mesh position={[0.11, 0.72, 0.64]} geometry={varioDrlGeo} material={carHeadlightMat} />

          {/* 4. Batok Stang (Head Cover), Visor, Speedometer Digital & Handgrip */}
          <mesh position={[0, 0.94, 0.44]} geometry={varioHeadCoverGeo} material={bodyMat} castShadow />
          <mesh position={[0, 1.02, 0.48]} rotation={[-0.4, 0, 0]} geometry={varioVisorGeo} material={motoScreenMat} />
          <mesh position={[0, 0.96, 0.40]} geometry={varioSpeedoGeo} material={motoScreenMat} />
          <mesh position={[0, 0.94, 0.38]} geometry={varioHandlebarGeo} material={motoChromeMat} />
          <mesh position={[-0.28, 0.94, 0.38]} rotation={[0, 0, Math.PI / 2]} geometry={varioGripGeo} material={motoGripMat} />
          <mesh position={[0.28, 0.94, 0.38]} rotation={[0, 0, Math.PI / 2]} geometry={varioGripGeo} material={motoGripMat} />

          {/* 5. Spion Sporty Runcing Khas Vario */}
          <group position={[-0.26, 1.04, 0.34]}>
            <mesh geometry={varioMirrorStemGeo} material={motoEngineMat} />
            <mesh position={[0, 0.08, 0]} geometry={varioMirrorHeadGeo} material={motoGripMat} />
          </group>
          <group position={[0.26, 1.04, 0.34]}>
            <mesh geometry={varioMirrorStemGeo} material={motoEngineMat} />
            <mesh position={[0, 0.08, 0]} geometry={varioMirrorHeadGeo} material={motoGripMat} />
          </group>

          {/* 6. Bodi Bawah Jok (Side Panels), Jok Lebar Skutik & Behel Tanduk Belakang */}
          <mesh position={[0, 0.50, -0.22]} geometry={varioSidePanelGeo} material={bodyMat} castShadow />
          <mesh position={[0, 0.68, -0.16]} geometry={varioSeatGeo} material={motoSeatMat} castShadow />
          <mesh position={[0, 0.72, -0.56]} geometry={varioGrabRailGeo} material={carChassisMat} />

          {/* 7. Ekor Belakang Runcing, Lampu Rem LED, Spakbor Gantung & Plat Nomor */}
          <mesh position={[0, 0.62, -0.54]} geometry={varioTailCowlGeo} material={bodyMat} castShadow />
          <mesh position={[0, 0.64, -0.74]} geometry={varioTaillightGeo} material={carTaillightMat} />
          <mesh position={[0, 0.38, -0.82]} geometry={varioRearFenderGeo} material={carChassisMat} />
          <mesh position={[0, 0.38, -0.88]} geometry={varioPlateGeo} material={carPlateMat} />

          {/* 8. Transmisi CVT Matik & Box Filter Udara di Sisi Kiri Belakang */}
          <mesh position={[-0.14, 0.26, -0.42]} geometry={varioCvtGeo} material={motoEngineMat} />
          <mesh position={[-0.14, 0.38, -0.50]} geometry={varioAirFilterGeo} material={carChassisMat} />

          {/* 9. Knalpot Skutik Sport & Cover Pelindung Panas Dua-Warna di Sisi Kanan Belakang */}
          <mesh position={[0.16, 0.28, -0.38]} rotation={[0.18, 0, 0]} geometry={varioExhaustGeo} material={motoEngineMat} />
          <mesh position={[0.21, 0.30, -0.38]} rotation={[0.18, 0, 0]} geometry={varioExhaustShieldGeo} material={carChromeMat} />
          <mesh position={[-0.16, 0.12, 0.0]} rotation={[0, 0, 0.35]} geometry={varioKickstandGeo} material={motoEngineMat} />

          {/* 10. Roda Depan 14-Inch Alloy dengan Piringan Cakram */}
          <group position={[0, 0.26, 0.76]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={varioTireFrontGeo} material={carTireMat} castShadow />
            <mesh geometry={varioRimFrontGeo} material={carRimMat} />
            <mesh geometry={varioDiscFrontGeo} material={motoChromeMat} />
            <mesh geometry={varioRimSpokeGeo} material={carRimMat} />
            <mesh geometry={varioRimSpokeGeo} rotation={[0, Math.PI / 3, 0]} material={carRimMat} />
            <mesh geometry={varioRimSpokeGeo} rotation={[0, -Math.PI / 3, 0]} material={carRimMat} />
          </group>

          {/* 11. Roda Belakang 14-Inch Alloy */}
          <group position={[0, 0.26, -0.66]} rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={varioTireRearGeo} material={carTireMat} castShadow />
            <mesh geometry={varioRimRearGeo} material={carRimMat} />
            <mesh geometry={varioRimSpokeRearGeo} material={carRimMat} />
            <mesh geometry={varioRimSpokeRearGeo} rotation={[0, Math.PI / 3, 0]} material={carRimMat} />
            <mesh geometry={varioRimSpokeRearGeo} rotation={[0, -Math.PI / 3, 0]} material={carRimMat} />
          </group>
        </group>

        {/* LOD 1: Siluet Streamlined Skutik (Jarak Jauh >= 14m) */}
        <group>
          <mesh position={[0, 0.28, 0.12]} geometry={varioFloorboardGeo} material={motoGripMat} />
          <mesh position={[0, 0.68, 0.52]} geometry={varioFrontCowlGeo} material={bodyMat} />
          <mesh position={[0, 0.94, 0.44]} geometry={varioHeadCoverGeo} material={bodyMat} />
          <mesh position={[0, 0.50, -0.22]} geometry={varioSidePanelGeo} material={bodyMat} />
          <mesh position={[0, 0.68, -0.16]} geometry={varioSeatGeo} material={motoSeatMat} />
          <mesh position={[0, 0.62, -0.54]} geometry={varioTailCowlGeo} material={bodyMat} />
          <mesh position={[0, 0.60, 0.68]} geometry={varioHeadlightGeo} material={carHeadlightMat} />
          <mesh position={[0, 0.64, -0.74]} geometry={varioTaillightGeo} material={carTaillightMat} />
          {/* Roda Siluet 14" */}
          <mesh position={[0, 0.26, 0.76]} rotation={[0, 0, Math.PI / 2]} geometry={varioTireFrontGeo} material={carTireMat} />
          <mesh position={[0, 0.26, -0.66]} rotation={[0, 0, Math.PI / 2]} geometry={varioTireRearGeo} material={carTireMat} />
        </group>
      </Detailed>
    </group>
  );
});

// Geometri & Material bersama untuk OutdoorWallLamp
const outdoorLampBackplateGeo = new THREE.BoxGeometry(0.18, 0.32, 0.03);
const outdoorLampBracketGeo = new THREE.BoxGeometry(0.05, 0.06, 0.08);
const outdoorLampSconceGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.32, 20);
const outdoorLampRingGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.035, 20);
const outdoorLampTopCapGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.02, 20);
const outdoorLampBottomCapGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.02, 20);
const outdoorLampLensGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.02, 20);

const outdoorLampBackplateMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8, roughness: 0.3 });
const outdoorLampBracketMat = new THREE.MeshStandardMaterial({ color: "#1e293b", metalness: 0.85, roughness: 0.25 });
const outdoorLampSconceMat = new THREE.MeshStandardMaterial({ color: "#111827", metalness: 0.7, roughness: 0.3 });
const outdoorLampRingMat = new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.9, roughness: 0.2 });
const outdoorLampCapMat = new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8 });
const outdoorLampLensOffMat = new THREE.MeshStandardMaterial({ color: "#475569", emissive: "#000000", emissiveIntensity: 0, toneMapped: false });

// Komponen Lampu Tempel Dinding Luar (Modern Architectural Outdoor Sconce)
// Otomatis menyala saat jam pulang kerja dan mati saat jam masuk kerja
const OutdoorWallLamp = React.memo(({
  position,
  rotation = [0, 0, 0],
  isOn = true,
  color = "#fbbf24",
  intensity = 2.8
}) => {
  const downLensMat = useMemo(() => {
    if (!isOn) return outdoorLampLensOffMat;
    return new THREE.MeshStandardMaterial({
      color: "#fef08a",
      emissive: color,
      emissiveIntensity: 3.0,
      toneMapped: false,
    });
  }, [isOn, color]);

  const upLensMat = useMemo(() => {
    if (!isOn) return outdoorLampLensOffMat;
    return new THREE.MeshStandardMaterial({
      color: "#fef08a",
      emissive: color,
      emissiveIntensity: 2.0,
      toneMapped: false,
    });
  }, [isOn, color]);

  return (
    <group position={position} rotation={rotation}>
      <Detailed distances={[0, 14]}>
        {/* LOD 0: Fixture Arsitektural Lengkap 8 Sub-mesh (< 14m) */}
        <group>
          {/* Backplate Dinding Logam Hitam Minimalis */}
          <mesh position={[0, 0, 0.015]} castShadow receiveShadow geometry={outdoorLampBackplateGeo} material={outdoorLampBackplateMat} />
          {/* Lengan / Bracket Penyangga Fixture */}
          <mesh position={[0, 0, 0.06]} castShadow geometry={outdoorLampBracketGeo} material={outdoorLampBracketMat} />
          {/* Badan Tabung Lampu Sconce (Silinder Vertikal Modern) */}
          <mesh position={[0, 0, 0.14]} castShadow receiveShadow geometry={outdoorLampSconceGeo} material={outdoorLampSconceMat} />
          {/* Cincin Aksen Emas/Tembaga Arsitektural Mewah */}
          <mesh position={[0, 0, 0.14]} geometry={outdoorLampRingGeo} material={outdoorLampRingMat} />
          {/* Top Cap & Bottom Cap Logam */}
          <mesh position={[0, 0.165, 0.14]} geometry={outdoorLampTopCapGeo} material={outdoorLampCapMat} />
          <mesh position={[0, -0.165, 0.14]} geometry={outdoorLampBottomCapGeo} material={outdoorLampCapMat} />
          {/* Lensa Bawah (Down-light Lens) */}
          <mesh position={[0, -0.175, 0.14]} geometry={outdoorLampLensGeo} material={downLensMat} />
          {/* Lensa Atas (Up-light Lens untuk Aksen Dinding) */}
          <mesh position={[0, 0.175, 0.14]} geometry={outdoorLampLensGeo} material={upLensMat} />
        </group>
        {/* LOD 1: Fixture Sederhana 2 Mesh (>= 14m) */}
        <group>
          <mesh position={[0, 0, 0.015]} geometry={outdoorLampBackplateGeo} material={outdoorLampBackplateMat} />
          <mesh position={[0, 0, 0.14]} geometry={outdoorLampSconceGeo} material={isOn ? downLensMat : outdoorLampSconceMat} />
        </group>
      </Detailed>

      {/* Cahaya Utama Menyinari Bawah & Area Lantai */}
      {isOn && (
        <>
          <pointLight
            position={[0, -0.3, 0.16]}
            intensity={intensity}
            distance={8.5}
            decay={2}
            color={color}
          />
          {/* Cahaya Lembut Aksen ke Atas Dinding */}
          <pointLight
            position={[0, 0.35, 0.16]}
            intensity={intensity * 0.4}
            distance={4.0}
            decay={2}
            color={color}
          />
        </>
      )}
    </group>
  );
});

export const OfficeEnvironment = React.memo(({ 
  onKanbanClick, 
  onInfoBoardClick, 
  npcState, 
  vehicleVisibility,
  lighting,
  deskScreens,
  tvScreens,
  onToggleDeskScreen,
  onToggleTvScreen,
  isOutdoorLightsOn = false,
  fridgeOpen = false,
  onToggleFridge,
  coffeeBrewing = false,
  onToggleCoffee
}) => {
  const carVisible = vehicleVisibility ? vehicleVisibility.bunga : npcState?.bunga?.visible;
  const candraVisible = vehicleVisibility ? vehicleVisibility.candra : npcState?.candra?.visible;
  const fajarVisible = vehicleVisibility ? vehicleVisibility.fajar : npcState?.fajar?.visible;
  const h = 4; // Tinggi dinding

  // State saklar lampu per ruangan (default: menyala semua)
  const [roomLights, setRoomLights] = useState({
    meeting: true,
    pantry: true,
    staff: true,
    ceo: true,
    lobby: true,
    toiletStaff1: true,
    toiletStaff2: true,
    toiletRestroom: true,
  });

  const toggleRoomLight = useCallback((roomKey) => {
    setRoomLights(prev => {
      const nextState = !prev[roomKey];
      playSwitchSound(nextState);
      return {
        ...prev,
        [roomKey]: nextState
      };
    });
  }, []);

  // Sinkronisasi warna & intensitas dari sistem pencahayaan dinamis (Warm/Cool by Game Time)
  const ceilingColor = lighting?.ceilingColor || "#fffbeb";
  const ceilingIntensity = lighting?.ceilingIntensity !== undefined ? lighting.ceilingIntensity : 4.0;
  const deskColor = lighting?.deskColor || "#fbbf24";
  const deskIntensity = lighting?.deskIntensity !== undefined ? lighting.deskIntensity : 1.3;
  const screenMult = lighting?.screenEmissiveMult !== undefined ? lighting.screenEmissiveMult : 1.0;
  const grassColor = lighting?.grassColor || "#355e2b";
  const pavingColor = lighting?.pavingColor || "#94a3b8";

  return (
    <group>
      {/* =======================
          STRUKTUR BANGUNAN DENAH BARU
          Ukuran Total: X(-15 to 15), Z(-12 to 9) (Diperluas ke belakang)
          ======================= */}

      {/* Dinding Eksterior */}
      <Wall position={[0, h / 2, -12]} args={[30, h, 0.4]} /> {/* Atas / Dinding Utara Eksterior */}
      <Wall position={[-15, h / 2, -1.5]} args={[0.4, h, 21]} /> {/* Kiri / Dinding Barat Eksterior */}

      {/* Dinding Selatan Eksterior (Z = 9) */}
      {/* 1. Tiang Dinding Sudut Barat Daya Pantry (X: -15.0 s/d -13.9, panjang 1.1m) */}
      <Wall position={[-14.45, h / 2, 9]} args={[1.1, h, 0.4]} />
      {/* 2a. Jendela Kaca Dinding Selatan Pantry - Sisi Barat (X: -13.9 s/d -11.1, lebar 2.8m) */}
      <GlassWindow position={[-12.5, h / 2, 9]} length={2.8} thickness={0.4} wallHeight={h} orientation="x" />
      {/* 2b. Tiang Dinding Pemisah Antar-Jendela Pantry (Safe Distance) (X: -11.1 s/d -9.9, lebar 1.2m) */}
      <Wall position={[-10.5, h / 2, 9]} args={[1.2, h, 0.4]} />
      {/* 2c. Jendela Kaca Dinding Selatan Pantry - Sisi Timur (X: -9.9 s/d -7.1, lebar 2.8m) */}
      <GlassWindow position={[-8.5, h / 2, 9]} length={2.8} thickness={0.4} wallHeight={h} orientation="x" />
      {/* 3. Tiang Dinding Pembatas Pantry vs Toilet (X: -7.1 s/d -6.0, panjang 1.1m) */}
      <Wall position={[-6.55, h / 2, 9]} args={[1.1, h, 0.4]} />
      {/* 4. Area Toilet & Restroom (X: -6.0 s/d 7.0, total panjang 13.0m):
             Dilengkapi jendela bovenlicht kecil (RestroomWindow) kaca buram privasi di dinding selatan masing-masing dari 3 bilik toilet */}
      {/* 4a. Tiang Dinding Sisi Barat Toilet Staf 1 (X: -6.00 s/d -4.25, panjang 1.75m) */}
      <Wall position={[-5.125, h / 2, 9]} args={[1.75, h, 0.4]} />
      {/* 4b. Jendela Restroom Toilet Staf 1 (X: -4.25 s/d -3.25, pusat X = -3.75, panjang 1.0m) */}
      <RestroomWindow position={[-3.75, h / 2, 9]} length={1.0} thickness={0.4} wallHeight={h} />
      {/* 4c. Tiang Dinding Antara Toilet Staf 1 & Toilet Staf 2 (X: -3.25 s/d +0.25, pusat X = -1.50, panjang 3.50m) */}
      <Wall position={[-1.5, h / 2, 9]} args={[3.5, h, 0.4]} />
      {/* 4d. Jendela Restroom Toilet Staf 2 (X: +0.25 s/d +1.25, pusat X = +0.75, panjang 1.0m) */}
      <RestroomWindow position={[0.75, h / 2, 9]} length={1.0} thickness={0.4} wallHeight={h} />
      {/* 4e. Tiang Dinding Antara Toilet Staf 2 & Restroom (X: +1.25 s/d +4.50, pusat X = +2.875, panjang 3.25m) */}
      <Wall position={[2.875, h / 2, 9]} args={[3.25, h, 0.4]} />
      {/* 4f. Jendela Restroom Bilik Restroom (X: +4.50 s/d +5.50, pusat X = +5.00, panjang 1.0m) */}
      <RestroomWindow position={[5.0, h / 2, 9]} length={1.0} thickness={0.4} wallHeight={h} />
      {/* 4g. Tiang Dinding Sisi Timur Restroom (X: +5.50 s/d +7.00, pusat X = +6.25, panjang 1.50m) */}
      <Wall position={[6.25, h / 2, 9]} args={[1.5, h, 0.4]} />
      {/* 5. Tiang Dinding Sudut Barat Pintu Keluar Lobi (X: 7.0 s/d 7.6, gap 40cm dari muka dalam dinding toilet X=7.2) */}
      <Wall position={[7.3, h / 2, 9]} args={[0.6, h, 0.4]} />
      {/* 6. Jendela Kaca Lobi Sisi Barat Pintu Keluar (X: 7.6 s/d 9.6, lebar 2.0m) */}
      <GlassWindow position={[8.6, h / 2, 9]} length={2.0} thickness={0.4} wallHeight={h} orientation="x" />
      {/* 7. Tiang Kusen Pintu Sisi Barat (X: 9.6 s/d 10.0) */}
      <Wall position={[9.8, h / 2, 9]} args={[0.4, h, 0.4]} />
      {/* 8. Bukaan Pintu Keluar Utama Lobi (X: 10.0 s/d 12.0, lebar 2.0m terbuka tanpa kaca di atasnya) */}
      {/* 9. Tiang Kusen Pintu Sisi Timur (X: 12.0 s/d 12.4) */}
      <Wall position={[12.2, h / 2, 9]} args={[0.4, h, 0.4]} />
      {/* 10. Jendela Kaca Lobi Sisi Timur Pintu Keluar (X: 12.4 s/d 14.4, lebar 2.0m) */}
      <GlassWindow position={[13.4, h / 2, 9]} length={2.0} thickness={0.4} wallHeight={h} orientation="x" />
      {/* 11. Tiang Dinding Sudut Tenggara (X: 14.4 s/d 15.0, gap 40cm ke muka dalam dinding timur lobi X=14.8) */}
      <Wall position={[14.7, h / 2, 9]} args={[0.6, h, 0.4]} />

      {/* Dinding Timur Eksterior (X = 15) */}
      {/* 1. Tiang Dinding Sudut Timur Laut (Z: -12.0 s/d -11.25) */}
      <Wall position={[15, h / 2, -11.625]} args={[0.4, h, 0.75]} />
      {/* 2. Jendela Kaca Separuh Utara Ruang CEO (Z: -11.25 s/d -6.75, lebar 4.5m = 75.0% <= 80% dinding utara CEO) */}
      <GlassWindow position={[15, h / 2, -9.0]} length={4.5} thickness={0.4} wallHeight={h} orientation="z" />
      {/* 3. Tiang Dinding Tengah Ruang CEO (Z: -6.75 s/d -6.0) */}
      <Wall position={[15, h / 2, -6.375]} args={[0.4, h, 0.75]} />
      {/* 4. Dinding Solid Separuh Selatan Ruang CEO (Z: -6.0 s/d 0.0) */}
      <Wall position={[15, h / 2, -3]} args={[0.4, h, 6]} />
      {/* 5. Tiang Dinding Pertemuan Z = 0 (Z: 0.0 s/d 1.1) */}
      <Wall position={[15, h / 2, 0.55]} args={[0.4, h, 1.1]} />
      {/* 6. Jendela Kaca Dinding Timur Lobi (Z: 1.1 s/d 7.9, lebar 6.8m = 75.5% <= 80% dinding timur lobi) */}
      <GlassWindow position={[15, h / 2, 4.5]} length={6.8} thickness={0.4} wallHeight={h} orientation="z" />
      {/* 7. Tiang Dinding Sudut Tenggara (Z: 7.9 s/d 9.0) */}
      <Wall position={[15, h / 2, 8.45]} args={[0.4, h, 1.1]} />

      {/* Dinding Horisontal Utama (Z = 0) */}
      <Wall position={[-10.5, h / 2, 0]} args={[9, h, 0.4]} /> {/* Meeting vs Pantry */}

      {/* Dinding Horisontal Staff Room */}
      <Wall position={[0.5, h / 2, 0]} args={[9, h, 0.4]} />

      <Wall position={[10.9, h / 2, 0]} args={[8.2, h, 0.4]} /> {/* CEO vs Lobby (Diperpanjang sedikit ke kiri untuk menutup celah X=7) */}

      {/* Dinding Vertikal Kiri (X = -6) - Partisi Kaca Staff Room vs Meeting Room */}
      <GlassPartition position={[-6, h / 2, -8.5]} args={[0.4, h, 7]} /> {/* Panel Kaca Z: -12 s/d -5 */}
      <GlassDoorTransom position={[-6, h / 2, -4]} length={2.0} thickness={0.4} height={h} /> {/* Kusen & Transom Pintu Akses Meeting Z: -5 s/d -3 */}
      <GlassPartition position={[-6, h / 2, -1.5]} args={[0.4, h, 3]} /> {/* Panel Kaca Z: -3 s/d 0 */}
      
      {/* Dinding Vertikal Kiri Area Pantry & Lounge (Dinding Solid) */}
      <Wall position={[-6, h / 2, 0.5]} args={[0.4, h, 1]} /> {/* Pintu Pantry 2 */}
      <Wall position={[-6, h / 2, 6]} args={[0.4, h, 6]} />

      {/* Dinding Vertikal Kanan (X = 7) - Partisi Kaca Staff Room vs Ruang CEO */}
      <GlassPartition position={[7, h / 2, -7.5]} args={[0.4, h, 9]} /> {/* Panel Kaca Z: -12 s/d -3 */}
      <GlassDoorTransom position={[7, h / 2, -2]} length={2.0} thickness={0.4} height={h} /> {/* Kusen & Transom Pintu Akses CEO Z: -3 s/d -1 */}
      <GlassPartition position={[7, h / 2, -0.4]} args={[0.4, h, 1.2]} /> {/* Panel Kaca Z: -1 s/d 0.2 */}
      
      {/* Dinding Vertikal Kanan Area Restroom vs Lobby (Dinding Solid) */}
      <Wall position={[7, h / 2, 7]} args={[0.4, h, 4]} /> {/* Restroom vs Lobby */}

      {/* Dinding Horisontal Toilet (Z = 5) */}
      <Wall position={[-5.35, h / 2, 5]} args={[1.3, h, 0.4]} />
      <Wall position={[-1.5, h / 2, 5]} args={[3.6, h, 0.4]} />
      <Wall position={[2.35, h / 2, 5]} args={[1.3, h, 0.4]} />
      <Wall position={[4.15, h / 2, 5]} args={[2.3, h, 0.4]} />
      <Wall position={[6.85, h / 2, 5]} args={[0.3, h, 0.4]} />

      {/* Dinding Vertikal Pemisah Toilet */}
      <Wall position={[-1.5, h / 2, 7]} args={[0.4, h, 4]} />
      <Wall position={[3, h / 2, 7]} args={[0.4, h, 4]} />


      {/* Lantai Interior Kantor dengan Tekstur Parquet Kayu Realistis (Rectangular Parquet) */}
      <Suspense fallback={<OfficeFloorFallback />}>
        <OfficeFloor />
      </Suspense>
      {/* Grid Lantai Kantor (Dipangkas rapi hanya di dalam area kantor 30m x 21m) */}
      <AreaGrid position={[0, 0.022, -1.5]} width={30} depth={21} step={1} color="#64748b" opacity={0.25} />

      {/* Teras Luar (warna berubah sesuai waktu) */}
      <mesh position={[11, 0.02, 11]} receiveShadow>
        <boxGeometry args={[8, 0.05, 4]} />
        <meshStandardMaterial color={pavingColor} roughness={0.7} />
      </mesh>
      {/* Grid Teras Luar (Dipangkas rapi hanya di area teras 8m x 4m) */}
      <AreaGrid position={[11, 0.046, 11]} width={8} depth={4} step={1} color="#64748b" opacity={0.35} />

      {/* Carport (warna berubah sesuai waktu) */}
      <mesh position={[-7, 0.02, 14]} receiveShadow>
        <boxGeometry args={[12, 0.03, 10]} />
        <meshStandardMaterial color={pavingColor} roughness={0.75} />
      </mesh>
      {/* Grid Carport (Dipangkas rapi hanya di area carport 12m x 10m) */}
      <AreaGrid position={[-7, 0.036, 14]} width={12} depth={10} step={1} color="#64748b" opacity={0.35} />

      {/* Lampu Tempel Dinding Luar: Kedua Sisi Pintu Keluar (Area Teras) */}
      <OutdoorWallLamp position={[9.8, 2.4, 9.22]} isOn={isOutdoorLightsOn} />
      <OutdoorWallLamp position={[12.2, 2.4, 9.22]} isOn={isOutdoorLightsOn} />

      {/* Lampu Tempel Dinding Luar: Area Carport (Dinding Depan Dekat Parkiran) */}
      <OutdoorWallLamp position={[-14.45, 2.4, 9.22]} isOn={isOutdoorLightsOn} />
      <OutdoorWallLamp position={[-5.125, 2.4, 9.22]} isOn={isOutdoorLightsOn} />

      {/* Tanaman Eksterior */}
      <PottedPlant position={[6.5, 0, 10]} />
      <PottedPlant position={[15.5, 0, 10]} />
      <PottedPlant position={[11, 0, -13]} />

      {/* Kendaraan di Carport */}
      {carVisible && <SimpleCar position={[-9, 0, 13.5]} color="#2563eb" rotation={[0, 0.1, 0]} />}

      {/* Parkiran Motor Luar */}
      {candraVisible && <SimpleMotorcycle position={[-1, 0, 12]} rotation={[0, 0.2, 0]} color="#fbbf24" />}
      {fajarVisible && <SimpleMotorcycle position={[-3, 0, 12]} rotation={[0, -0.1, 0]} color="#10b981" />}

      {/* =======================
          FURNITUR RUANGAN & LABEL
          ======================= */}

      {/* Instanced Furniture: 7 Rangka Meja & 14 Kursi Kantor (Draw calls: 105 -> 7) */}
      <InstancedOfficeDesks />
      <InstancedOfficeChairs />

      {/* 1. MEETING ROOM */}
      <RoomSign position={[-7.5, 2.5, -0.2]} rotation={[0, Math.PI, 0]} text="MEETING ROOM" />
      <MeetingTable position={[-10.5, 0, -6]} />
      {/* Layar TV Presentasi Utama & Lampu Gantung Meeting (RectAreaLight Neon) */}
      <MeetingDisplay 
        id="meeting"
        position={[-10.5, 2.3, -11.75]} 
        screenMult={screenMult} 
        isOn={tvScreens?.meeting ?? true}
        onToggle={onToggleTvScreen}
      />
      <CeilingLamp
        position={[-10.5, 3.4, -6]}
        width={6}
        rotation={[0, Math.PI / 2, 0]}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.meeting}
      />
      {/* Saklar Lampu Ruang Meeting (Dinding Barat / West Wall) */}
      <LightSwitch
        roomKey="meeting"
        position={[-14.77, 1.4, -3.0]}
        rotation={[0, Math.PI / 2, 0]}
        isOn={roomLights.meeting}
        onToggle={toggleRoomLight}
        roomName="MEETING ROOM"
      />
      {/* Kursi Ruang Meeting di-render via InstancedOfficeChairs */}
      <KanbanBoard position={[-14, 0, -6]} rotation={[0, Math.PI / 2, 0]} onClick={onKanbanClick} />

      {/* 2. PANTRY + LOUNGE */}
      <RoomSign position={[-7.5, 2.5, 0.2]} text="PANTRY + LOUNGE" />
      <KitchenCounter position={[-10.5, 0, 8]} />
      {/* Mesin Kopi Espresso Modern di Atas Counter Dapur */}
      <CoffeeMachine position={[-11.5, 1.3, 7.8]} isBrewing={coffeeBrewing} onBrew={onToggleCoffee} />
      {/* Kulkas Kantor 2-Pintu Stainless Steel */}
      <Refrigerator position={[-13.8, 0, 8.0]} isOpen={fridgeOpen} onToggle={onToggleFridge} />
      <Sofa position={[-10.5, 0, 2]} />
      <Sofa position={[-10.5, 0, 5]} rotation={[0, Math.PI, 0]} />
      {/* Lampu Area Lounge/Sofa */}
      <CeilingLamp
        position={[-10.5, 3.4, 3]}
        width={4}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.pantry}
      />
      {/* Lampu Area Counter Dapur Pantry */}
      <CeilingLamp
        position={[-10.5, 3.4, 7.5]}
        width={4}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.pantry}
      />
      {/* Saklar Lampu Pantry + Lounge */}
      <LightSwitch
        roomKey="pantry"
        position={[-7.5, 1.4, 0.23]}
        rotation={[0, 0, 0]}
        isOn={roomLights.pantry}
        onToggle={toggleRoomLight}
        roomName="PANTRY & LOUNGE"
      />

      {/* 3. STAFF ROOM (Diperluas, jarak meja lega) */}
      <RoomSign position={[0.5, 2.7, 0.2]} text="STAFF ROOM" />
      {/* Papan Informasi & To-Do List di Dinding Selatan Staff Room (Z = 0) */}
      <InfoBoard position={[-1.5, 1.8, -0.22]} title="TO-DO LIST" initialContent={"- Selesaikan UI Login\n- Fix bug di Dashboard\n- Meeting mingguan"} onClick={onInfoBoardClick} />
      <InfoBoard position={[2.5, 1.8, -0.22]} title="PENGUMUMAN" initialContent={"Tolong jaga kebersihan pantry.\n\nJangan lupa submit timesheet tiap Jumat."} onClick={onInfoBoardClick} />

      {/* Lampu Gantung Linear RectAreaLight di atas Area Kerja Staff */}
      <CeilingLamp
        position={[0.5, 3.4, -9]}
        width={10}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.staff}
      />
      <CeilingLamp
        position={[0.5, 3.4, -5]}
        width={10}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.staff}
      />
      {/* Saklar Lampu Staff Room (Dinding Selatan / South Wall) */}
      <LightSwitch
        roomKey="staff"
        position={[-3.6, 1.4, -0.23]}
        rotation={[0, Math.PI, 0]}
        isOn={roomLights.staff}
        onToggle={toggleRoomLight}
        roomName="STAFF ROOM"
      />

      {/* Baris Belakang (Menghadap depan) - Semua Meja Dilengkapi Lampu Meja PointLight */}
      {/* Meja Agung (CTO/PM) */}
      <DeskWithLaptop
        id="agung"
        position={[-4, 0, -9]}
        renderDeskFrame={false}
        screenColor="#38bdf8"
        monitorColor="#0ea5e9"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.agung ?? true}
        onToggleScreen={onToggleDeskScreen}
      />
      {/* Meja Bunga (UI/UX) */}
      <DeskWithLaptop
        id="bunga"
        position={[0.5, 0, -9]}
        renderDeskFrame={false}
        screenColor="#a855f7"
        monitorColor="#8b5cf6"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.bunga ?? true}
        onToggleScreen={onToggleDeskScreen}
      />
      {/* Meja Candra (FE) */}
      <DeskWithLaptop
        id="candra"
        position={[5, 0, -9]}
        renderDeskFrame={false}
        screenColor="#34d399"
        monitorColor="#10b981"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.candra ?? true}
        onToggleScreen={onToggleDeskScreen}
      />

      {/* Baris Depan (Menghadap belakang) - Semua Meja Dilengkapi Lampu Meja PointLight */}
      {/* Meja Dika (BE) */}
      <DeskWithLaptop
        id="dika"
        position={[-4, 0, -5]}
        rotation={[0, Math.PI, 0]}
        renderDeskFrame={false}
        screenColor="#f472b6"
        monitorColor="#ec4899"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.dika ?? true}
        onToggleScreen={onToggleDeskScreen}
      />
      {/* Meja Eka (QA) */}
      <DeskWithLaptop
        id="eka"
        position={[0.5, 0, -5]}
        rotation={[0, Math.PI, 0]}
        renderDeskFrame={false}
        screenColor="#38bdf8"
        monitorColor="#06b6d4"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.eka ?? true}
        onToggleScreen={onToggleDeskScreen}
      />
      {/* Meja Fajar (DevOps) */}
      <DeskWithLaptop
        id="fajar"
        position={[5, 0, -5]}
        rotation={[0, Math.PI, 0]}
        renderDeskFrame={false}
        screenColor="#fb923c"
        monitorColor="#f97316"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.fajar ?? true}
        onToggleScreen={onToggleDeskScreen}
      />

      {/* 4. CEO / FOUNDER */}
      <RoomSign position={[6.8, 2.5, -4]} rotation={[0, -Math.PI / 2, 0]} text="CEO / FOUNDER" />
      <CeilingLamp
        position={[11, 3.4, -7]}
        width={4}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.ceo}
      />
      {/* Saklar Lampu Ruang CEO (Dinding Selatan / South Wall) */}
      <LightSwitch
        roomKey="ceo"
        position={[8.2, 1.4, -0.23]}
        rotation={[0, Math.PI, 0]}
        isOn={roomLights.ceo}
        onToggle={toggleRoomLight}
        roomName="CEO ROOM"
      />
      {/* Meja CEO Bege */}
      <DeskWithLaptop
        id="ceo"
        position={[11, 0, -9]}
        rotation={[0, Math.PI, 0]}
        renderDeskFrame={false}
        screenColor="#38bdf8"
        monitorColor="#6366f1"
        hasLamp={true}
        lampColor={deskColor}
        lampIntensity={deskIntensity}
        screenMult={screenMult}
        isScreenOn={deskScreens?.ceo ?? true}
        onToggleScreen={onToggleDeskScreen}
      />

      {/* Papan Standing Whiteboard Strategi CEO (Dinding Timur Menghadap ke Barat) */}
      <StandingWhiteboard
        position={[14.2, 0, -7.5]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* Sofa Set Eksekutif CEO (Lounge Tamu VIP Menghadap ke Barat) */}
      <ModernSofa
        position={[13.7, 0, -4.2]}
        rotation={[0, -Math.PI / 2, 0]}
        width={2.4}
        color="#3a2312"
      />
      <CoffeeTable
        position={[12.2, 0, -4.2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Armchair
        position={[12.2, 0, -5.6]}
        rotation={[0, 0, 0]}
        color="#3a2312"
      />
      <Armchair
        position={[12.2, 0, -2.8]}
        rotation={[0, Math.PI, 0]}
        color="#3a2312"
      />

      {/* Televisi Dinding Ruang CEO (Dashboard Analitik Eksekutif) */}
      <WallTV
        id="ceo"
        position={[11, 2.3, -0.25]}
        rotation={[0, Math.PI, 0]}
        screenMult={screenMult}
        title="CEO DASHBOARD // EXECUTIVE ANALYTICS"
        subtitle={"Revenue Growth: +142% • Active AI Agents: 8\nProject Status: All Systems Operational"}
        accentColor="#38bdf8"
        screenColor="#0369a1"
        isOn={tvScreens?.ceo ?? true}
        onToggle={onToggleTvScreen}
      />

      {/* 5. LOBBY */}
      {/* Neonbox "pandekode" di dinding belakang lobby desk */}
      <NeonBox
        position={[11, 2.4, 0.2]}
        rotation={[0, 0, 0]}
        screenMult={screenMult}
        isLightOn={roomLights.lobby}
      />
      {/* Lampu Gantung Lobi Dipindahkan ke Tengah Ruangan (Maju ke Arah Pintu Keluar di Z = 5.0) */}
      <CeilingLamp
        position={[11, 3.4, 5.0]}
        width={4}
        color={ceilingColor}
        intensity={ceilingIntensity}
        isOn={roomLights.lobby}
      />
      {/* Saklar Lampu Lobby (Dinding Barat Lobi / West Wall bersebelahan dengan TV) */}
      <LightSwitch
        roomKey="lobby"
        position={[7.22, 1.4, 5.35]}
        rotation={[0, Math.PI / 2, 0]}
        isOn={roomLights.lobby}
        onToggle={toggleRoomLight}
        roomName="LOBBY"
        badgeWidth={1.1}
      />
      <RigidBody type="fixed" colliders="cuboid" position={[11, 0.5, 2]}>
        <mesh castShadow><boxGeometry args={[4, 1, 1]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      </RigidBody>
      {/* Papan Nama Ruangan "LOBBY & RECEPTION" di Bagian Depan Meja Lobi Menghadap ke Luar */}
      <RoomSign
        position={[11, 0.55, 2.52]}
        rotation={[0, 0, 0]}
        text="LOBBY & RECEPTION"
      />
      {/* Laptop Resepsionis Gita di Meja Depan */}
      <ReceptionDeskLaptop
        id="gita"
        position={[11.0, 1.0, 1.85]}
        rotation={[0, Math.PI, 0]}
        screenColor="#38bdf8"
        screenMult={screenMult}
        isOn={deskScreens?.gita ?? true}
        onToggle={onToggleDeskScreen}
      />
      <DeskLamp position={[12.2, 1.0, 2]} rotation={[0, -Math.PI / 2, 0]} color={deskColor} intensity={deskIntensity} />

      {/* Sofa Set Ruang Tunggu Tamu Lobi */}
      <ModernSofa
        position={[13.7, 0, 6.2]}
        rotation={[0, -Math.PI / 2, 0]}
        width={2.2}
        color="#1e293b"
      />
      <CoffeeTable
        position={[12.3, 0, 6.2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Armchair
        position={[12.3, 0, 4.8]}
        rotation={[0, 0, 0]}
        color="#1e293b"
      />

      {/* Televisi Dinding Lobi (Dinding Barat Lobi / West Wall menghadap ke sofa tamu) */}
      <WallTV
        id="lobby"
        position={[7.24, 2.3, 7.3]}
        rotation={[0, Math.PI / 2, 0]}
        screenMult={screenMult}
        title="PANDEKODE HQ // WELCOME"
        subtitle={"Next-Gen AI & Interactive 3D Workspaces\nSilakan Menunggu di Sofa Tamu"}
        accentColor="#38bdf8"
        screenColor="#0284c7"
        isOn={tvScreens?.lobby ?? true}
        onToggle={onToggleTvScreen}
      />

      {/* 6. TOILETS */}
      <ToiletCubicle position={[-3.75, 0, 8.2]} />

      {/* Papan Nama Ruangan Toilet Staf (Dipusatkan di antara kedua toilet pada X = -1.5) */}
      <RoomSign position={[-1.5, 2.45, 4.8]} rotation={[0, Math.PI, 0]} text="STAFF TOILET" />
      <ToiletCubicle position={[0.75, 0, 8.2]} />

      <RoomSign position={[3.5, 2.5, 4.8]} rotation={[0, Math.PI, 0]} text="RESTROOM" />
      <ToiletCubicle position={[5, 0, 8.2]} />

      {/* Satu Bohlam (Light Bulb) Mandiri di Masing-Masing Ruangan (Digeser dekat ke dinding selatan) */}
      {/* 1. Bohlam Staff Toilet 1 (Kiri) */}
      <LightBulb
        position={[-3.75, 3.1, 7.8]}
        color={ceilingColor}
        intensity={4.5}
        isOn={roomLights.toiletStaff1}
      />
      {/* 2. Bohlam Staff Toilet 2 (Tengah) */}
      <LightBulb
        position={[0.75, 3.1, 7.8]}
        color={ceilingColor}
        intensity={4.5}
        isOn={roomLights.toiletStaff2}
      />
      {/* 3. Bohlam Restroom (Kanan) */}
      <LightBulb
        position={[5.0, 3.1, 7.8]}
        color={ceilingColor}
        intensity={4.5}
        isOn={roomLights.toiletRestroom}
      />

      {/* Plat Dudukan Elegan 3-Gang Switch di Dinding Depan Toilet (Dipusatkan di X = -1.5, Vertikal di Bawah Plang) */}
      <mesh position={[-1.5, 1.45, 4.755]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[1.22, 0.46, 0.015]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.25} roughness={0.4} />
      </mesh>

      {/* 3 Saklar Berjajar di Dinding Antara Kedua Toilet (Dipusatkan di X = -1.5) */}
      {/* Saklar 1: Staff Toilet 1 */}
      <LightSwitch
        roomKey="toiletStaff1"
        position={[-1.92, 1.45, 4.77]}
        rotation={[0, Math.PI, 0]}
        isOn={roomLights.toiletStaff1}
        onToggle={toggleRoomLight}
        roomName="STAFF 1"
        badgeWidth={0.38}
        compact={true}
      />

      {/* Saklar 2: Staff Toilet 2 */}
      <LightSwitch
        roomKey="toiletStaff2"
        position={[-1.50, 1.45, 4.77]}
        rotation={[0, Math.PI, 0]}
        isOn={roomLights.toiletStaff2}
        onToggle={toggleRoomLight}
        roomName="STAFF 2"
        badgeWidth={0.38}
        compact={true}
      />

      {/* Saklar 3: Restroom */}
      <LightSwitch
        roomKey="toiletRestroom"
        position={[-1.08, 1.45, 4.77]}
        rotation={[0, Math.PI, 0]}
        isOn={roomLights.toiletRestroom}
        onToggle={toggleRoomLight}
        roomName="RESTROOM"
        badgeWidth={0.42}
        compact={true}
      />

    </group>
  );
});
