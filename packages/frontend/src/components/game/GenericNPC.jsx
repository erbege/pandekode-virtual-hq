import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import LowPolyHuman from '../shared/LowPolyHuman';
import { useCameraController } from './controllers/useCameraController';
import { usePlayerMovement } from './controllers/usePlayerMovement';
import { useNPCNavigation } from './controllers/useNPCNavigation';
import useInteractionStore, { getAffinityTier } from '../../stores/useInteractionStore';

/**
 * GenericNPC - Komponen Terpadu Karakter NPC & Pemain (Orchestrator)
 * Bertanggung jawab:
 * - Menampung referensi fisik (Rapier RigidBody), mesh Three.js, tag nama HTML, dan animRef
 * - Mendelegasikan kontrol kamera ke useCameraController (R5, R6, R7, R10)
 * - Mendelegasikan kontrol manual ke usePlayerMovement (R2, R3, R8 saat isPlayer = true)
 * - Mendelegasikan navigasi A* dan anti-stuck ke useNPCNavigation (saat isPlayer = false)
 * - Merender LowPolyHuman dan overlay UI/dialog
 */
const GenericNPC = ({ 
  id, targetPosition, intent, onArrive, dialogue, position, color, name, isVisible, 
  onProfileClick, latestPositionsRef, isPlayer, cameraMode, isCameraLocked, setIsCameraLocked, 
  onWalkThroughDoor, onWalkOutDoor, isChatOpen 
}) => {
  const rbRef = useRef(null);
  const meshRef = useRef(null);
  const htmlGroupRef = useRef(null);
  const [, forceUpdate] = useState(0);
  const { rapier, world } = useRapier();

  // Posisi spawn awal stabil di lantai (Y = 0) agar RigidBody Rapier tidak di-reset setiap re-render React
  const initialPosRef = useRef(position ? [position[0], 0, position[2]] : [0, 0, 0]);

  // Ref animasi prosedural untuk LowPolyHuman (menghindari re-render React pada 60 FPS)
  const animRef = useRef({
    isSitting: false,
    isTyping: false,
    isWalking: false,
    isTalking: false,
    isJumping: false,
    walkDir: 0,
    strafeDir: 0,
    speed: 0,
    isSprinting: false
  });

  // Helper: hentikan pergerakan horizontal (dengan menjaga kecepatan vertikal)
  const stopHorizontal = useCallback((vy) => {
    if (!rbRef.current) return;
    const currentY = vy !== undefined ? vy : rbRef.current.linvel().y;
    rbRef.current.setLinvel({ x: 0, y: currentY, z: 0 }, true);
  }, []);

  // 1. Controller Kamera (Isometric Q/E + Transisi Mulus V + Collision Avoidance R5 + Deadzone R10)
  const { updateCamera } = useCameraController({
    isPlayer,
    cameraMode,
    isCameraLocked,
    rapier,
    world,
    rbRef,
    meshRef
  });

  // 2. Controller Navigasi AI NPC (NavMesh, Reynolds Steering, Flow Fields, 4-Stage Recovery)
  const { pathRef, pathIndexRef, updateNPCNavigation } = useNPCNavigation({
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
  });

  // 3. Controller Gerakan Manual Pemain (WASD, Sprint Shift, Acceleration, Boundary Clamp)
  const { updatePlayerMovement } = usePlayerMovement({
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
  });

  // Reposisi langsung ke teras depan luar pintu saat memicu animasi masuk kantor khusus CEO
  useEffect(() => {
    if (intent === "CEO_WALK_IN" && rbRef.current && position) {
      rbRef.current.setTranslation({ x: position[0], y: position[1] || 1.0, z: position[2] }, true);
      rbRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rbRef.current.wakeUp();
    }
  }, [intent, position]);

  // Loop utama R3F (60 FPS)
  useFrame((state, delta) => {
    if (!isVisible || !rbRef.current || !meshRef.current || !targetPosition) return;

    const dt = Math.min(delta || 0.016, 0.1);
    const currentPos = rbRef.current.translation();

    // Sinkronisasi posisi global
    if (latestPositionsRef) {
      latestPositionsRef.current[id] = [currentPos.x, currentPos.y, currentPos.z];
    }

    if (isPlayer) {
      // Update pergerakan pemain (WASD, akselerasi, lompatan Spasi, orientasi badan)
      const { isPlayerAtDesk } = updatePlayerMovement(state, dt, currentPos);
      // Update kamera pemain (Follow, transisi mode, rotasi Q/E)
      updateCamera(state, dt, currentPos, animRef, isPlayerAtDesk);
    } else {
      // Update AI pergerakan NPC
      updateNPCNavigation(state, dt, currentPos);
    }
  });

  if (!isVisible) return null;

  // Interaction Store subscriptions
  const npcMood = useInteractionStore(state => state.npcMoods[id]);
  const affinityPts = useInteractionStore(state => state.playerAffinity[id] || 0);
  const affinityTier = getAffinityTier(affinityPts);
  const isEventAffected = useInteractionStore(state => 
    Boolean(state.activeEvent && state.activeEvent.status === 'active' && state.activeEvent.affectedNpcs?.includes(id))
  );
  const eventIcon = useInteractionStore(state => state.activeEvent?.icon || '⚠️');

  return (
    <RigidBody 
      ref={rbRef} 
      position={position || [0, 2, 0]} 
      lockRotations 
      friction={0} 
      type="dynamic" 
      colliders={false}
      linearDamping={2}
      canSleep={false}
    >
      <CapsuleCollider 
        args={[0.6, 0.25]} 
        position={[0, 0.85, 0]} 
        friction={0}
        frictionCombineRule="min"
        restitution={0}
        restitutionCombineRule="min"
      />
      <group ref={meshRef}>
        <LowPolyHuman color={color} animRef={animRef} hideHead={isPlayer && cameraMode === 2} />
        {!(isPlayer && cameraMode === 2) && (
          <group ref={htmlGroupRef} position={[0, 2.35, 0]}>
            <Html center zIndexRange={[100, 0]} distanceFactor={8}>
              <div 
                onClick={() => onProfileClick && onProfileClick(id)}
                style={{
                  backgroundColor: isPlayer 
                    ? 'rgba(30, 58, 138, 0.92)' 
                    : isEventAffected 
                      ? 'rgba(153, 27, 27, 0.92)' 
                      : 'rgba(15, 23, 42, 0.88)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                  minWidth: '110px',
                  boxShadow: isPlayer 
                    ? '0 0 16px rgba(59, 130, 246, 0.6)' 
                    : isEventAffected 
                      ? '0 0 16px rgba(239, 68, 68, 0.7)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.35)',
                  border: isPlayer 
                    ? '1.5px solid #60a5fa' 
                    : isEventAffected 
                      ? '1.5px solid #ef4444' 
                      : '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'transform 0.15s ease',
                  transform: 'scale(1)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Event Alert Badge jika NPC sedang dalam krisis */}
                {isEventAffected && !isPlayer && (
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#fee2e2',
                    backgroundColor: '#dc2626',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    animation: 'pulse 1s infinite'
                  }}>
                    {eventIcon} SEDANG PANIK / MERESPON
                  </div>
                )}

                {/* Header: Nama NPC & Tag You */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isPlayer ? '#ffffff' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  {isPlayer && (
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: '#2563eb',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 800
                    }}>
                      YOU
                    </span>
                  )}
                  <span>{name}</span>
                </div>

                {/* Sub-Badges Bar: Mood System & Relationship Tier */}
                {!isPlayer && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    marginTop: '4px'
                  }}>
                    {/* Mood Badge */}
                    {npcMood && (
                      <span 
                        title={`Mood: ${npcMood.reason || npcMood.mood}`}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '8px',
                          backgroundColor: npcMood.mood === 'stressed' 
                            ? 'rgba(239, 68, 68, 0.3)' 
                            : npcMood.mood === 'neutral' 
                              ? 'rgba(245, 158, 11, 0.3)' 
                              : 'rgba(16, 185, 129, 0.3)',
                          color: npcMood.mood === 'stressed' 
                            ? '#fca5a5' 
                            : npcMood.mood === 'neutral' 
                              ? '#fde68a' 
                              : '#86efac',
                          border: `1px solid ${npcMood.color}60`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {npcMood.emoji} {npcMood.mood === 'stressed' ? 'Stres' : npcMood.mood === 'neutral' ? 'Fokus' : 'Happy'}
                      </span>
                    )}

                    {/* Relationship Badge */}
                    <span 
                      title={`Tingkat Relasi: ${affinityTier.title} (${affinityTier.points} XP)`}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '8px',
                        backgroundColor: `${affinityTier.color}25`,
                        color: affinityTier.color,
                        border: `1px solid ${affinityTier.color}50`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {affinityTier.emoji} Lv.{affinityTier.level}
                    </span>
                  </div>
                )}

                {/* Dialogue Speech Bubble */}
                {dialogue && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '11.5px',
                    maxWidth: '220px',
                    whiteSpace: 'normal',
                    lineHeight: '1.4',
                    fontStyle: 'italic',
                    padding: '5px 8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    "{dialogue}"
                  </div>
                )}

                {/* Intent Tag */}
                {intent && intent !== "IDLE" && intent !== "NONE" && !isPlayer && (
                   <div style={{
                     marginTop: '4px',
                     fontSize: '9px',
                     color: '#94a3b8',
                     textTransform: 'uppercase',
                     letterSpacing: '0.5px'
                   }}>
                     [{intent}]
                   </div>
                )}
              </div>
            </Html>
          </group>
        )}
      </group>
    </RigidBody>
  );

};

export default React.memo(GenericNPC);
