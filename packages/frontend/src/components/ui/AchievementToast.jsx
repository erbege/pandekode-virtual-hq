import React, { useEffect } from 'react';
import useInteractionStore from '../../stores/useInteractionStore';

const AchievementToast = () => {
  const toast = useInteractionStore(state => state.unlockedToast);
  const dismissToast = useInteractionStore(state => state.dismissToast);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 3500,
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div 
        onClick={dismissToast}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          border: '2px solid #fbbf24',
          borderRadius: '16px',
          padding: '14px 22px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 25px rgba(251, 191, 36, 0.35)',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
          cursor: 'pointer',
          minWidth: '320px',
          maxWidth: '460px'
        }}
      >
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
          flexShrink: 0
        }}>
          {toast.icon || '🏆'}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#fbbf24'
            }}>
              ✨ PENCAPAIAN TERBUKA!
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>• {toast.category}</span>
          </div>
          <h4 style={{
            margin: '2px 0 4px',
            fontSize: '16px',
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            color: '#ffffff'
          }}>
            {toast.title}
          </h4>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: 1.35
          }}>
            {toast.description}
          </p>
        </div>

        <div style={{ color: '#94a3b8', fontSize: '16px', paddingLeft: '4px' }}>
          ✖
        </div>
      </div>
    </div>
  );
};

export default React.memo(AchievementToast);
