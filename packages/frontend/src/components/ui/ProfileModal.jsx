import React, { useEffect } from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import useInteractionStore, { getAffinityTier } from '../../stores/useInteractionStore';

const ProfileModal = ({ npc, npcId, onClose, controlledNpcId, setControlledNpcId, setIsCameraLocked, onToggleCEO }) => {
  if (!npc) return null;
  
  const avatarUrl = npc.avatarUrl;

  const npcMood = useInteractionStore(state => state.npcMoods[npcId]);
  const affinityPts = useInteractionStore(state => state.playerAffinity[npcId] || 0);
  const affinityTier = getAffinityTier(affinityPts);
  const bestFriend = useInteractionStore(state => state.getNpcBestFriend(npcId));
  const addPlayerAffinity = useInteractionStore(state => state.addPlayerAffinity);

  // Berikan sedikit affinity point (+1) saat user mengenal/membaca profil staf
  useEffect(() => {
    addPlayerAffinity(npcId, 1);
  }, [npcId, addPlayerAffinity]);
  
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{
        width: '480px', maxHeight: '88vh', overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column',
        borderTop: `5px solid ${npc.color}`, borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <img src={avatarUrl} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${npc.color}`, backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '22px', color: '#1e293b', fontFamily: 'Outfit, sans-serif' }}>{npc.fullName}</h2>
              <p style={{ margin: 0, color: npc.color, fontWeight: 600, fontSize: '14px' }}>{npc.role}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#1e293b'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>✖</button>
        </div>

        {/* --- MOOD SYSTEM CARD --- */}
        {npcMood && (
          <div style={{
            background: npcMood.mood === 'stressed' 
              ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
              : npcMood.mood === 'neutral' 
                ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' 
                : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: `1.5px solid ${npcMood.color}40`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: npcMood.color, fontWeight: 800 }}>
                Status Mood & Beban Kerja (Kanban)
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: npcMood.color,
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '2px 8px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                {npcMood.emoji} {npcMood.mood === 'stressed' ? 'Stres / Lembur' : npcMood.mood === 'neutral' ? 'Fokus / Terkendali' : 'Bahagia / Puas'}
              </span>
            </div>

            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.4 }}>
              📌 {npcMood.reason}
            </div>

            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748b' }}>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                To Do: <b>{npcMood.todoCount || 0}</b>
              </span>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                In Progress: <b>{npcMood.inProgressCount || 0}</b>
              </span>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                Review: <b>{npcMood.reviewCount || 0}</b>
              </span>
              <span style={{ background: 'white', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
                Done: <b>{npcMood.doneCount || 0}</b>
              </span>
            </div>
          </div>
        )}

        {/* --- RELATIONSHIP & AFFINITY CARD --- */}
        <div style={{
          background: 'rgba(248, 250, 252, 0.9)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>
              Hubungan dengan Anda
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 800,
              color: affinityTier.color,
              background: `${affinityTier.color}15`,
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {affinityTier.emoji} Lv.{affinityTier.level} {affinityTier.title}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
              <span>Poin Afinitas: <b>{affinityTier.points} XP</b></span>
              <span>{affinityTier.next ? `${affinityTier.progress}% menuju Lv.${affinityTier.level + 1}` : 'Level Maksimal'}</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${affinityTier.progress}%`, height: '100%', backgroundColor: affinityTier.color, borderRadius: '999px', transition: 'width 0.3s' }} />
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#475569' }}>
            ✨ <b>Manfaat Hubungan:</b> {affinityTier.perk}
          </div>

          {bestFriend && (
            <div style={{ fontSize: '11px', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
              🤝 Rekan kerja terdekat di kantor: <b style={{ color: '#475569' }}>{bestFriend.name}</b> ({bestFriend.points} pts)
            </div>
          )}
        </div>

        {npcId === 'ceo' && (
          <button 
            onClick={() => {
              if (onToggleCEO) {
                onToggleCEO();
              } else {
                if (controlledNpcId === npcId) {
                  setControlledNpcId(null);
                  setIsCameraLocked(false);
                  usePlayerStore.getState().setCameraMode(0);
                } else {
                  setControlledNpcId(npcId);
                  setIsCameraLocked(true);
                }
              }
              onClose();
            }}
            className="btn-primary"
            style={{
              width: '100%', marginBottom: '10px', padding: '11px', fontSize: '14px',
              background: controlledNpcId === npcId ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              boxShadow: controlledNpcId === npcId ? '0 10px 20px -10px rgba(239,68,68,0.8)' : '0 10px 20px -10px rgba(16,185,129,0.8)'
            }}
          >
            {controlledNpcId === npcId ? '🎮 Berhenti Berperan Sebagai CEO' : '🎮 Berperan Sebagai CEO'}
          </button>
        )}
        
        <button 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('openChatWithNpc', { detail: { npcId: npcId } }));
            onClose();
          }}
          className="btn-primary"
          style={{ width: '100%', marginBottom: '20px', padding: '11px', fontSize: '14px' }}
        >
          💬 Chat dengan {npc.fullName.split(' ')[0]}
        </button>
        
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Persona & Karakter */}
          {npc.persona && (
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '6px' }}>
                Persona & Karakter
              </span>
              <p style={{ margin: '0 0 10px', fontSize: '13.5px', color: '#334155', lineHeight: '1.5', background: 'rgba(255,255,255,0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                {npc.persona}
              </p>
              {npc.traits && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {npc.traits.map(trait => (
                    <span key={trait} style={{ 
                      backgroundColor: `${npc.color}15`, 
                      color: npc.color, 
                      border: `1px solid ${npc.color}40`, 
                      padding: '4px 10px', 
                      borderRadius: '16px', 
                      fontSize: '12px', 
                      fontWeight: 600 
                    }}>
                      ✨ {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Motto / Filosofi */}
          {npc.motto && (
            <div style={{ 
              borderLeft: `3px solid ${npc.color}`, 
              paddingLeft: '12px', 
              fontStyle: 'italic', 
              fontSize: '13px', 
              color: '#475569',
              background: 'rgba(248, 250, 252, 0.7)',
              padding: '8px 12px',
              borderRadius: '0 8px 8px 0'
            }}>
              "{npc.motto}"
            </div>
          )}

          {/* Kebiasaan & Quirks */}
          {npc.quirks && (
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '4px' }}>
                Kebiasaan di Kantor
              </span>
              <span style={{ fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>
                ☕ {npc.quirks}
              </span>
            </div>
          )}

          {/* Skill & Spesialisasi */}
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 600 }}>
              Skill & Spesialisasi
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {npc.skills.map(skill => (
                <span key={skill} style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '5px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', color: '#334155', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Info Tambahan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Jenis Kelamin</span>
              <span style={{ fontWeight: '500', fontSize: '13.5px', color: '#334155' }}>{npc.gender}</span>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tempat, Tgl Lahir</span>
              <span style={{ fontWeight: '500', fontSize: '13.5px', color: '#334155' }}>{npc.birthPlace}, {npc.birthDate}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
