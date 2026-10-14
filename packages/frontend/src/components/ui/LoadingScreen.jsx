import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

const LoadingScreen = ({ isSceneReady, onFinish }) => {
  const { progress, active } = useProgress();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Haluskan animasi persentase agar selalu naik mulus
  useEffect(() => {
    const target = isSceneReady ? 100 : Math.max(progress, 15);
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= target) {
          clearInterval(interval);
          return target;
        }
        return Math.min(prev + 3, target);
      });
    }, 20);

    return () => clearInterval(interval);
  }, [progress, isSceneReady]);

  // Transisi fade-out saat scene sudah siap render
  useEffect(() => {
    if (isSceneReady && displayProgress >= 100) {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const finishTimer = setTimeout(() => {
          setIsDone(true);
          if (onFinish) onFinish();
        }, 600);
        return () => clearTimeout(finishTimer);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isSceneReady, displayProgress, onFinish]);

  if (isDone) return null;

  // Pesan kontekstual sesuai progres
  let statusMessage = "Mengunduh aset & tekstur kantor...";
  if (displayProgress > 35 && displayProgress <= 70) {
    statusMessage = "Menginisialisasi Rapier Physics Engine & collision...";
  } else if (displayProgress > 70 && displayProgress < 100) {
    statusMessage = "Menyiapkan shader pencahayaan, sky atmosphere & NPC...";
  } else if (displayProgress >= 100) {
    statusMessage = "Kantor virtual siap! Selamat bekerja...";
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 40%, #1e1b4b 0%, #030712 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s ease',
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
    >
      {/* Background ambient decorative glow */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '460px',
          width: '90%',
          padding: '36px 32px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(16px)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Animated Badge Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
            marginBottom: '20px',
            animation: 'pulse 2s infinite ease-in-out',
          }}
        >
          🏢
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '0.05em',
            margin: '0 0 6px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          PANDEKODE HQ
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
          Virtual Office & Interactive Coding Workspace
        </p>

        {/* Progress Bar Container */}
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(51, 65, 85, 0.6)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${displayProgress}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
              borderRadius: '999px',
              transition: 'width 0.2s ease-out',
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.8)',
            }}
          />
        </div>

        {/* Progress Info & Status Message */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '12px',
            color: '#64748b',
            marginBottom: '18px',
          }}
        >
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>{statusMessage}</span>
          <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
            {Math.round(displayProgress)}%
          </span>
        </div>

        {/* Tips Box */}
        <div
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          💡 <strong style={{ color: '#cbd5e1' }}>Tips:</strong> Tekan <code style={{ color: '#38bdf8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>R</code> untuk mengambil alih peran CEO, dan gunakan <code style={{ color: '#38bdf8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>V</code> untuk mengganti sudut kamera POV.
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
