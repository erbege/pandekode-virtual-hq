import React, { useState } from 'react';
import useInteractionStore, { getAffinityTier } from '../../stores/useInteractionStore';
import { initialNPCs } from '../../data/npcProfiles';

const AffinityModal = ({ onClose }) => {
  const playerAffinity = useInteractionStore(state => state.playerAffinity);
  const npcAffinity = useInteractionStore(state => state.npcAffinity);
  const getNpcBestFriend = useInteractionStore(state => state.getNpcBestFriend);

  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'synergy'

  const npcList = Object.entries(initialNPCs).map(([id, npc]) => {
    const pts = playerAffinity[id] || 0;
    const tier = getAffinityTier(pts);
    const bestFriend = getNpcBestFriend(id);
    return { id, npc, pts, tier, bestFriend };
  }).sort((a, b) => b.pts - a.pts);

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content" style={{
        width: '90%',
        maxWidth: '820px',
        maxHeight: '85vh',
        padding: '30px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.96)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)'
            }}>
              ❤️
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '22px',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 800,
                color: '#1e293b'
              }}>
                Hubungan & Sinergi Tim
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                Kekompakan kerja, tingkat afinitas antar-staf, dan ikatan kolaborasi kantor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'color 0.2s',
              padding: '6px'
            }}
            onMouseOver={(e) => e.target.style.color = '#1e293b'}
            onMouseOut={(e) => e.target.style.color = '#94a3b8'}
          >
            ✖
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveTab('player')}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'player' ? '#1e293b' : '#f1f5f9',
              color: activeTab === 'player' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            👤 Relasi Anda dengan Tim
          </button>
          <button
            onClick={() => setActiveTab('synergy')}
            style={{
              padding: '8px 18px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === 'synergy' ? '#1e293b' : '#f1f5f9',
              color: activeTab === 'synergy' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s'
            }}
          >
            🌐 Jaringan Sinergi Antar-NPC
          </button>
        </div>

        {/* Tab 1: Player Relationship */}
        {activeTab === 'player' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '14px',
            paddingRight: '6px'
          }}>
            {npcList.map(({ id, npc, pts, tier, bestFriend }) => (
              <div
                key={id}
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <img
                  src={npc.avatarUrl}
                  alt={npc.fullName}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: `2px solid ${npc.color}`,
                    flexShrink: 0,
                    backgroundColor: '#f8fafc'
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b', fontWeight: 700 }}>
                      {npc.fullName}
                    </h4>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: tier.color,
                      background: `${tier.color}15`,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {tier.emoji} Lv.{tier.level} {tier.title}
                    </span>
                  </div>

                  <p style={{ margin: '2px 0 8px', fontSize: '12px', color: '#64748b' }}>
                    {npc.role}
                  </p>

                  {/* Progress Bar XP */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '3px' }}>
                      <span>Afinitas: <b>{pts} pts</b></span>
                      <span>{tier.next ? `${tier.progress}% ke Lv.${tier.level + 1}` : 'Level Maksimal'}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${tier.progress}%`,
                        height: '100%',
                        backgroundColor: tier.color,
                        borderRadius: '999px',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>

                  {/* Perk / Manfaat */}
                  <div style={{
                    fontSize: '11.5px',
                    color: '#475569',
                    background: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    lineHeight: 1.3
                  }}>
                    ✨ <b>Benefit:</b> {tier.perk}
                  </div>

                  {bestFriend && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                      Paling akrab di kantor dengan: <b style={{ color: '#64748b' }}>{bestFriend.name.split(' ')[0]}</b> ({bestFriend.points} pts)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Synergy Matrix */}
        {activeTab === 'synergy' && (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '18px',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#1e293b' }}>
                🤝 Dinamika Obrolan & Kolaborasi Antar-NPC
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                Setiap kali NPC mengobrol di Staff Room, Lounge, Pantry, atau Lobi, poin kedekatan mereka bertambah. Tim dengan sinergi tinggi bekerja lebih cepat dan lebih tahan stres!
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(npcAffinity).sort(([, a], [, b]) => b - a).map(([pair, points]) => {
                const [idA, idB] = pair.split('_');
                const npcA = initialNPCs[idA];
                const npcB = initialNPCs[idB];
                if (!npcA || !npcB) return null;

                const nameA = npcA.name.split(' ')[0];
                const nameB = npcB.name.split(' ')[0];

                return (
                  <div
                    key={pair}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', position: 'relative', width: '48px', height: '28px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          backgroundColor: npcA.color, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', position: 'absolute', left: 0,
                          border: '2px solid white'
                        }}>
                          {nameA.charAt(0)}
                        </div>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          backgroundColor: npcB.color, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', position: 'absolute', left: '18px',
                          border: '2px solid white'
                        }}>
                          {nameB.charAt(0)}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {nameA} & {nameB}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#fdf2f8',
                      color: '#db2777',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      ❤️ {points}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(AffinityModal);
