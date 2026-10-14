import React, { useState } from 'react';
import useInteractionStore from '../../stores/useInteractionStore';

const AchievementModal = ({ onClose }) => {
  const achievements = useInteractionStore(state => state.achievements);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unlocked', 'locked'

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const percentage = Math.round((unlockedCount / totalCount) * 100);

  const filteredList = achievements.filter(a => {
    if (activeFilter === 'unlocked') return a.unlocked;
    if (activeFilter === 'locked') return !a.unlocked;
    return true;
  });

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
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
      }}>
        {/* Header Modal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          paddingBottom: '18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}>
              🏆
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '22px',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 800,
                color: '#1e293b'
              }}>
                Pencapaian & Badge Kantor
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                Koleksi medali penghargaan atas kontribusi dan interaksi Anda di PANDEKODE HQ
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

        {/* Progress Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: 'white',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fbbf24', fontWeight: 700 }}>
                Total Progres Pencapaian
              </span>
              <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', marginTop: '2px' }}>
                {unlockedCount} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 500 }}>/ {totalCount} Terbuka</span>
              </div>
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              color: '#fbbf24'
            }}>
              {percentage}%
            </div>
          </div>

          {/* Bar Gauge */}
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #f59e0b 0%, #10b981 100%)',
              borderRadius: '999px',
              transition: 'width 0.5s ease-out'
            }} />
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { id: 'all', label: `Semua (${totalCount})` },
            { id: 'unlocked', label: `Terbuka (${unlockedCount}) 🌟` },
            { id: 'locked', label: `Terkunci (${totalCount - unlockedCount}) 🔒` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeFilter === tab.id ? '#1e293b' : '#f1f5f9',
                color: activeFilter === tab.id ? '#ffffff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid Kartu Achievement */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '14px',
          paddingRight: '6px'
        }}>
          {filteredList.map(ach => {
            const progressRatio = Math.min(100, Math.round(((ach.progress || 0) / ach.target) * 100));

            return (
              <div
                key={ach.id}
                style={{
                  background: ach.unlocked ? '#ffffff' : '#f8fafc',
                  border: ach.unlocked ? '2px solid #fcd34d' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  opacity: ach.unlocked ? 1 : 0.75,
                  boxShadow: ach.unlocked ? '0 4px 12px rgba(251, 191, 36, 0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {/* Icon Badge */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: ach.unlocked 
                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
                    : '#e2e8f0',
                  border: ach.unlocked ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0,
                  filter: ach.unlocked ? 'none' : 'grayscale(1)'
                }}>
                  {ach.icon}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: ach.unlocked ? '#b45309' : '#94a3b8'
                    }}>
                      {ach.category}
                    </span>
                    {ach.unlocked && (
                      <span style={{
                        fontSize: '10px',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        TERBUKA ✨
                      </span>
                    )}
                  </div>

                  <h4 style={{
                    margin: '3px 0 4px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: ach.unlocked ? '#1e293b' : '#64748b'
                  }}>
                    {ach.title}
                  </h4>

                  <p style={{
                    margin: '0 0 10px',
                    fontSize: '12.5px',
                    color: '#64748b',
                    lineHeight: 1.4
                  }}>
                    {ach.description}
                  </p>

                  {/* Progress Bar Mini */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '6px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progressRatio}%`,
                        height: '100%',
                        backgroundColor: ach.unlocked ? '#10b981' : '#3b82f6',
                        borderRadius: '999px'
                      }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                      {ach.progress || 0}/{ach.target}
                    </span>
                  </div>

                  {ach.unlocked && ach.unlockedAt && (
                    <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#94a3b8' }}>
                      Dibuka pada jam {ach.unlockedAt}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AchievementModal);
