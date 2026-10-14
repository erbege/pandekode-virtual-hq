import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Detailed } from '@react-three/drei';

// Geometri & Material bersama untuk LowPolyHuman (Tahap 2 Optimasi)
const humanHeadGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const humanVisorGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
const humanTorsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
const humanArmGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
const humanLegGeo = new THREE.BoxGeometry(0.18, 0.54, 0.18);

const humanHeadMat = new THREE.MeshStandardMaterial({ color: "#fca5a5" });
const humanVisorMat = new THREE.MeshStandardMaterial({ color: "#111827" });
const humanPantsMat = new THREE.MeshStandardMaterial({ color: "#1e1b4b" });

/**
 * LowPolyHuman dengan animasi prosedural hierarki sendi (Joint Hierarchy):
 * - Sendi pinggul (hip joints) dan sendi bahu (shoulder joints) berputar di titik pangkal alami,
 *   mencegah bug ekstrem naik-turun / robeknya anggota badan dari torso.
 * - Duduk ergonomis di kursi kerja (isSitting)
 * - Mengetik di laptop (isTyping)
 * - Berjalan alami dengan ayunan kaki & tangan (isWalking)
 * - Berbicara dengan gestur (isTalking)
 */
const LowPolyHuman = ({ 
  color, 
  animRef,
  hideHead = false,
  isSitting: propSitting = false, 
  isTyping: propTyping = false, 
  isWalking: propWalking = false, 
  isTalking: propTalking = false 
}) => {
  const leftArmJointRef = useRef();
  const rightArmJointRef = useRef();
  const leftLegJointRef = useRef();
  const rightLegJointRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  const walkPhaseRef = useRef(0);

  const shirtMat = useMemo(() => new THREE.MeshStandardMaterial({ color }), [color]);

  useFrame((state, delta) => {
    const dt = Math.min(delta || 0.016, 0.1);
    const t = state.clock.getElapsedTime();

    // Baca state animasi langsung dari animRef untuk performa tanpa re-render React
    const isSitting = animRef ? animRef.current.isSitting : propSitting;
    const isTyping = animRef ? animRef.current.isTyping : propTyping;
    const isWalking = animRef ? animRef.current.isWalking : propWalking;
    const isTalking = animRef ? animRef.current.isTalking : propTalking;
    const isJumping = animRef ? animRef.current.isJumping : false;

    // Ketinggian torso, kepala, dan sendi saat duduk vs berdiri
    const targetBodyY = isSitting ? 0.80 : 0.93;
    const targetHeadY = isSitting ? 1.36 : 1.48;
    const targetHipY = isSitting ? 0.48 : 0.56;
    const targetShoulderY = isSitting ? 1.10 : 1.23;

    if (bodyRef.current) {
      bodyRef.current.position.y += (targetBodyY - bodyRef.current.position.y) * 0.15;
    }
    if (headRef.current) {
      headRef.current.position.y += (targetHeadY - headRef.current.position.y) * 0.15;
    }
    if (leftLegJointRef.current) {
      leftLegJointRef.current.position.y += (targetHipY - leftLegJointRef.current.position.y) * 0.15;
      leftLegJointRef.current.position.z += ((isSitting ? 0.22 : 0) - leftLegJointRef.current.position.z) * 0.15;
    }
    if (rightLegJointRef.current) {
      rightLegJointRef.current.position.y += (targetHipY - rightLegJointRef.current.position.y) * 0.15;
      rightLegJointRef.current.position.z += ((isSitting ? 0.22 : 0) - rightLegJointRef.current.position.z) * 0.15;
    }
    if (leftArmJointRef.current) {
      leftArmJointRef.current.position.y += (targetShoulderY - leftArmJointRef.current.position.y) * 0.15;
      leftArmJointRef.current.position.z += ((isSitting ? 0.10 : 0) - leftArmJointRef.current.position.z) * 0.15;
    }
    if (rightArmJointRef.current) {
      rightArmJointRef.current.position.y += (targetShoulderY - rightArmJointRef.current.position.y) * 0.15;
      rightArmJointRef.current.position.z += ((isSitting ? 0.10 : 0) - rightArmJointRef.current.position.z) * 0.15;
    }

    if (isSitting) {
      // --- POSISI DUDUK ERGONOMIS DI KURSI KERJA ---
      if (headRef.current) {
        // Menatap ke arah layar monitor / laptop
        headRef.current.rotation.x = 0.12 + (isTalking ? Math.sin(t * 5) * 0.08 : 0);
        headRef.current.rotation.y = isTalking ? Math.sin(t * 3) * 0.15 : 0;
      }
      
      // Kaki ditekuk 90 derajat mendatar ke depan di atas dudukan kursi
      if (leftLegJointRef.current) {
        leftLegJointRef.current.rotation.set(-Math.PI / 2, 0, 0);
      }
      if (rightLegJointRef.current) {
        rightLegJointRef.current.rotation.set(-Math.PI / 2, 0, 0);
      }

      // Tangan tepat berada di atas meja kerja & keyboard laptop
      if (isTyping) {
        // Animasi mengetik: jari/tangan bergetar aktif di atas keyboard
        const typeL = Math.sin(t * 15) * 0.02;
        const typeR = Math.cos(t * 15 + 1) * 0.02;

        if (leftArmJointRef.current) {
          leftArmJointRef.current.rotation.set(-1.42 + typeL, 0.2, 0);
        }
        if (rightArmJointRef.current) {
          rightArmJointRef.current.rotation.set(-1.42 + typeR, -0.2, 0);
        }
      } else {
        // Duduk rileks / mendengarkan diskusi
        const talkArmL = isTalking ? Math.sin(t * 4) * 0.1 : 0;
        const talkArmR = isTalking ? Math.cos(t * 4) * 0.1 : 0;

        if (leftArmJointRef.current) {
          leftArmJointRef.current.rotation.set(-0.95 + talkArmL, 0.15, 0);
        }
        if (rightArmJointRef.current) {
          rightArmJointRef.current.rotation.set(-0.95 + talkArmR, -0.15, 0);
        }
      }
    } else {
      // --- POSISI BERDIRI / BERJALAN ---
      if (headRef.current) {
        headRef.current.rotation.x = isTalking ? Math.sin(t * 5) * 0.08 : 0;
        headRef.current.rotation.y = isTalking ? Math.sin(t * 3) * 0.15 : 0;
      }

      if (isJumping) {
        // --- POSE MELOMPAT DI UDARA (AIRBORNE / JUMP POSE) ---
        // Kaki sedikit ditekuk ke belakang
        if (leftLegJointRef.current) {
          leftLegJointRef.current.rotation.set(-0.4, 0, 0.1);
        }
        if (rightLegJointRef.current) {
          rightLegJointRef.current.rotation.set(-0.4, 0, -0.1);
        }
        // Lengan terangkat sedikit untuk keseimbangan
        if (leftArmJointRef.current) {
          leftArmJointRef.current.rotation.set(0.2, 0, 0.35);
        }
        if (rightArmJointRef.current) {
          rightArmJointRef.current.rotation.set(0.2, 0, -0.35);
        }
        if (bodyRef.current) {
          bodyRef.current.rotation.set(-0.08, 0, 0);
        }
      } else if (isWalking) {
        // Frekuensi langkah dinamis & ayunan lengan proporsional terhadap kecepatan (Walk vs Sprint)
        const curSpeed = animRef?.current?.speed;
        const isSprinting = animRef?.current?.isSprinting || false;
        const stepRate = isSprinting ? 11.5 : (curSpeed ? Math.max(6.5, Math.min(curSpeed * 1.8, 10)) : 8);
        walkPhaseRef.current += dt * stepRate;
        const phase = walkPhaseRef.current;
        const swingMultiplier = isSprinting ? 1.25 : 1.0;
        const sprintBodyLean = isSprinting ? -0.10 : -0.04;

        // Animasi melangkah kaki dan ayunan tangan alami berputar pada hip & shoulder joint
        const walkDir = animRef?.current?.walkDir !== undefined ? animRef.current.walkDir : 1;
        const strafeDir = animRef?.current?.strafeDir !== undefined ? animRef.current.strafeDir : 0;

        if (walkDir === 0 && strafeDir !== 0) {
          // Gerak bergeser murni menyamping (Strafe Kiri / Kanan)
          const strafeCycle = Math.sin(phase);
          const legSwingZ = strafeCycle * 0.28 * strafeDir * swingMultiplier;
          if (leftLegJointRef.current) {
            leftLegJointRef.current.rotation.set(strafeCycle * 0.15, 0, legSwingZ);
          }
          if (rightLegJointRef.current) {
            rightLegJointRef.current.rotation.set(-strafeCycle * 0.15, 0, legSwingZ);
          }
          if (leftArmJointRef.current) {
            leftArmJointRef.current.rotation.set(0, 0, 0.05 + Math.cos(phase) * 0.08 * swingMultiplier);
          }
          if (rightArmJointRef.current) {
            rightArmJointRef.current.rotation.set(0, 0, -0.05 + Math.cos(phase) * 0.08 * swingMultiplier);
          }
          if (bodyRef.current) {
            bodyRef.current.rotation.set(0, 0, -strafeDir * 0.04);
          }
        } else {
          // Gerak maju, berjalan mundur, atau kombinasi diagonal
          const cycleSign = walkDir < 0 ? -1 : 1;
          const walkCycle = cycleSign * Math.sin(phase);
          const legSwingZ = strafeDir !== 0 ? Math.sin(phase) * 0.18 * strafeDir * swingMultiplier : 0;

          if (leftLegJointRef.current) {
            leftLegJointRef.current.rotation.set(walkCycle * 0.5 * swingMultiplier, 0, legSwingZ);
          }
          if (rightLegJointRef.current) {
            rightLegJointRef.current.rotation.set(-walkCycle * 0.5 * swingMultiplier, 0, legSwingZ);
          }
          if (leftArmJointRef.current) {
            leftArmJointRef.current.rotation.set(-walkCycle * 0.45 * swingMultiplier, 0, 0.05);
          }
          if (rightArmJointRef.current) {
            rightArmJointRef.current.rotation.set(walkCycle * 0.45 * swingMultiplier, 0, -0.05);
          }
          if (bodyRef.current) {
            const pitch = walkDir < 0 ? 0.03 : sprintBodyLean;
            const roll = strafeDir !== 0 ? -strafeDir * 0.03 : 0;
            bodyRef.current.rotation.set(pitch, 0, roll);
          }
        }
      } else {
        // Idle berdiri diam (napas halus di bahu)
        const breathe = Math.sin(t * 2) * 0.01;
        if (bodyRef.current) {
          bodyRef.current.rotation.set(0, 0, 0);
        }
        if (leftLegJointRef.current) {
          leftLegJointRef.current.rotation.set(0, 0, 0);
        }
        if (rightLegJointRef.current) {
          rightLegJointRef.current.rotation.set(0, 0, 0);
        }
        if (leftArmJointRef.current) {
          leftArmJointRef.current.rotation.set(breathe, 0, 0.05);
        }
        if (rightArmJointRef.current) {
          rightArmJointRef.current.rotation.set(breathe, 0, -0.05);
        }
      }
    }
  });

  return (
    <group>
      {/* Kepala & Kacamata dengan LOD */}
      <mesh ref={headRef} position={[0, 1.48, 0]} castShadow visible={!hideHead} geometry={humanHeadGeo} material={humanHeadMat}>
        {/* Kacamata / Visor dengan LOD (di-cull saat jarak >= 16m) */}
        <Detailed distances={[0, 16]}>
          <mesh position={[0, 0.05, 0.21]} geometry={humanVisorGeo} material={humanVisorMat} />
          <group />
        </Detailed>
      </mesh>

      {/* Badan / Torso */}
      <mesh ref={bodyRef} position={[0, 0.93, 0]} castShadow geometry={humanTorsoGeo} material={shirtMat} />

      {/* Sendi Bahu Kiri & Lengan Kiri */}
      <group ref={leftArmJointRef} position={[-0.35, 1.23, 0]}>
        <mesh position={[0, -0.325, 0]} castShadow geometry={humanArmGeo} material={shirtMat} />
      </group>

      {/* Sendi Bahu Kanan & Lengan Kanan */}
      <group ref={rightArmJointRef} position={[0.35, 1.23, 0]}>
        <mesh position={[0, -0.325, 0]} castShadow geometry={humanArmGeo} material={shirtMat} />
      </group>

      {/* Sendi Pinggul Kiri & Kaki Kiri */}
      <group ref={leftLegJointRef} position={[-0.15, 0.56, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow geometry={humanLegGeo} material={humanPantsMat} />
      </group>

      {/* Sendi Pinggul Kanan & Kaki Kanan */}
      <group ref={rightLegJointRef} position={[0.15, 0.56, 0]}>
        <mesh position={[0, -0.27, 0]} castShadow geometry={humanLegGeo} material={humanPantsMat} />
      </group>
    </group>
  );
};

export default React.memo(LowPolyHuman);
