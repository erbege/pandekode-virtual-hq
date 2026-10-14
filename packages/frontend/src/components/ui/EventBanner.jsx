import React from 'react';
import useInteractionStore from '../../stores/useInteractionStore';
import { initialNPCs } from '../../data/npcProfiles';

const EventBanner = () => {
  const activeEvent = useInteractionStore(state => state.activeEvent);
  const isVisible = useInteractionStore(state => state.eventBannerVisible);
  const resolveEvent = useInteractionStore(state => state.resolveEvent);
  const dismissEventBanner = useInteractionStore(state => state.dismissEventBanner);

  if (!activeEvent || !isVisible) return null;

  const isResolved = activeEvent.status === 'resolved';
  const isExpired = activeEvent.status === 'expired';

  const progressPercent = activeEvent.durationSeconds 
    ? Math.max(0, Math.min(100, (activeEvent.timeRemaining / activeEvent.durationSeconds) * 100))
    : 0;

  return (
    <div style={{
      position: 'absolute',
      top: 76,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2500,
      width: '92%',
      maxWidth: '680px',
      animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        background: isResolved 
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)'
          : isExpired 
            ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.95) 0%, rgba(71, 85, 105, 0.95) 100%)'
            : (activeEvent.bgGradient || 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '18px 24px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Progress Bar Waktu untuk Event Aktif */}
        {!isResolved && !isExpired && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${progressPercent}%`,
            height: '4px',
            background: 'linear-gradient(90deg, #facc15, #ef4444)',
            transition: 'width 1s linear'
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              fontSize: '32px',
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              {isResolved ? '✅' : isExpired ? '⌛' : activeEvent.icon}
            </div>
            
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: isResolved ? '#047857' : isExpired ? '#475569' : 'rgba(0, 0, 0, 0.3)',
                  color: '#ffffff'
                }}>
                  {isResolved ? 'TERATASI' : isExpired ? 'SELESAI (TIMEOUT)' : (activeEvent.source ? (activeEvent.source === 'procedural' ? 'STARTUP LIFE' : activeEvent.source.toUpperCase()) : 'EVENT KANTOR')}
                </span>
                {!isResolved && !isExpired && (
                  <span style={{ fontSize: '12px', color: '#fef08a', fontWeight: 600 }}>
                    ⏱️ {activeEvent.timeRemaining}s
                  </span>
                )}
              </div>

              <h3 style={{
                margin: '4px 0 6px',
                fontSize: '18px',
                fontWeight: 800,
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '-0.01em'
              }}>
                {activeEvent.title}
              </h3>

              <p style={{
                margin: '0 0 10px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.45
              }}>
                {isResolved 
                  ? activeEvent.resolvedOption?.actionText || 'Krisis kantor berhasil diselesaikan oleh Anda dan tim!'
                  : isExpired 
                    ? 'Waktu krisis telah berlalu. Tim perlahan kembali ke rutinitas kerja normal.'
                    : activeEvent.description}
              </p>

              {/* Avatar NPC yang Terlibat */}
              {!isResolved && !isExpired && activeEvent.affectedNpcs && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    Staf Terdampak:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {activeEvent.affectedNpcs.map(npcId => {
                      const npc = initialNPCs[npcId];
                      return (
                        <div 
                          key={npcId}
                          title={`${npc?.name || npcId} sedang bereaksi terhadap event ini`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            border: `1px solid ${npc?.color || '#94a3b8'}80`
                          }}
                        >
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: npc?.color || '#94a3b8'
                          }} />
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>
                            {npc?.name?.split(' ')[0] || npcId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={dismissEventBanner}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            title="Tutup banner"
          >
            ✖
          </button>
        </div>

        {/* Pilihan Tindakan Interaktif untuk Pemain */}
        {!isResolved && !isExpired && activeEvent.options && activeEvent.options.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {activeEvent.options.map(option => (
              <button
                key={option.id}
                onClick={() => resolveEvent(option.id)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#0f172a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EventBanner);
