import React, { useState, useRef, useEffect } from 'react';

const SettingsBox = ({ 
  timeMode, setTimeMode, 
  startTime, setStartTime, 
  endTime, setEndTime, 
  workingHoursEnabled, setWorkingHoursEnabled,
  postFxSettings = { bloom: true, ssao: true, vignette: true, toneMapping: true },
  setPostFxSettings,
  gameTime, setGameTime,
  lighting
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleEffect = (key) => {
    if (setPostFxSettings) {
      setPostFxSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const allEffectsEnabled = Boolean(
    (postFxSettings?.bloom ?? true) &&
    (postFxSettings?.ssao ?? true) &&
    (postFxSettings?.vignette ?? true) &&
    (postFxSettings?.toneMapping ?? true)
  );

  const someEffectsEnabled = Boolean(
    (postFxSettings?.bloom ?? true) ||
    (postFxSettings?.ssao ?? true) ||
    (postFxSettings?.vignette ?? true) ||
    (postFxSettings?.toneMapping ?? true)
  );

  const masterCheckboxRef = useRef(null);

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someEffectsEnabled && !allEffectsEnabled;
    }
  }, [someEffectsEnabled, allEffectsEnabled]);

  const toggleAllEffects = () => {
    if (setPostFxSettings) {
      const targetState = !allEffectsEnabled;
      setPostFxSettings({
        bloom: targetState,
        ssao: targetState,
        vignette: targetState,
        toneMapping: targetState
      });
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="chat-send-btn"
        style={{
          position: 'absolute', bottom: 20, right: 20, width: 48, height: 48,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
          fontSize: 20, zIndex: 10, background: '#3b82f6'
        }}
        title="Pengaturan"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="glass-panel" style={{
      position: 'absolute', bottom: 20, right: 20, width: 350, maxHeight: '85vh', overflowY: 'auto',
      padding: '22px', fontFamily: 'Inter, sans-serif', zIndex: 10, color: '#1e293b'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>⚙️ Pengaturan</span>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✖</button>
      </div>

      {/* Efek Post-Processing dengan Master Toggle & Checkbox per Efek */}
      <div style={{ marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.7)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✨ Post-Processing Effects</span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 6,
            backgroundColor: allEffectsEnabled ? '#dcfce7' : someEffectsEnabled ? '#fef3c7' : '#f1f5f9',
            color: allEffectsEnabled ? '#15803d' : someEffectsEnabled ? '#b45309' : '#64748b',
            fontWeight: 600
          }}>
            {allEffectsEnabled ? 'Semua Aktif' : someEffectsEnabled ? 'Sebagian' : 'Nonaktif'}
          </span>
        </div>

        {/* Master Checkbox: Toggle Semua Efek Sekaligus */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          padding: '8px 10px',
          marginBottom: 10,
          backgroundColor: allEffectsEnabled ? 'rgba(59, 130, 246, 0.08)' : 'rgba(241, 245, 249, 0.7)',
          borderRadius: 8,
          border: '1px solid ' + (allEffectsEnabled ? 'rgba(59, 130, 246, 0.25)' : 'rgba(203, 213, 225, 0.8)'),
          transition: 'all 0.2s ease'
        }}>
          <input 
            ref={masterCheckboxRef}
            type="checkbox" 
            checked={allEffectsEnabled}
            onChange={toggleAllEffects}
            style={{ width: 17, height: 17, accentColor: '#3b82f6', cursor: 'pointer' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              Semua Efek Visual
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {allEffectsEnabled ? 'Nonaktifkan semua efek (performa maksimal)' : 'Aktifkan semua efek visual sekaligus'}
            </div>
          </div>
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
          {/* 1. Bloom */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={postFxSettings?.bloom ?? true}
              onChange={() => toggleEffect('bloom')}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Bloom</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Glow effect pada lampu & monitor</div>
            </div>
          </label>

          {/* 2. SSAO */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={postFxSettings?.ssao ?? true}
              onChange={() => toggleEffect('ssao')}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>SSAO</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Ambient Occlusion untuk kedalaman visual</div>
            </div>
          </label>

          {/* 3. Vignette */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={postFxSettings?.vignette ?? true}
              onChange={() => toggleEffect('vignette')}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Vignette</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Efek gelap di pinggir layar</div>
            </div>
          </label>

          {/* 4. ToneMapping */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={postFxSettings?.toneMapping ?? true}
              onChange={() => toggleEffect('toneMapping')}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: '#3b82f6' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>ToneMapping</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>ACES Filmic untuk warna sinematik</div>
            </div>
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.6)', padding: '12px', borderRadius: '8px' }}>
          <input 
            type="checkbox" 
            checked={workingHoursEnabled}
            onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Aktifkan Siklus Kerja</span>
        </label>
        <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0 34px', lineHeight: 1.4 }}>
          Jika dinonaktifkan, NPC akan bekerja 24/7.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Mode Waktu</label>
        <select 
          value={timeMode} onChange={(e) => setTimeMode(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', fontFamily: 'Inter' }}
        >
          <option value="simulated">Fast Forward (1 Menit/Detik)</option>
          <option value="realtime">Real-Time (Waktu Nyata)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Jam Masuk</label>
          <input 
            type="number" min="0" max="23" value={startTime} 
            onChange={(e) => setStartTime(parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' }}>Jam Pulang</label>
          <input 
            type="number" min="0" max="23" value={endTime} 
            onChange={(e) => setEndTime(parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
      </div>
      
      {/* Pengujian Cepat Waktu & Pencahayaan Realistis */}
      {setGameTime && (
        <div style={{ marginBottom: 16, padding: '12px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              💡 Preset Pencahayaan Realistis
            </span>
            {lighting && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: lighting.isCool ? '#e0f2fe' : '#fef3c7', color: lighting.isCool ? '#0369a1' : '#b45309', fontWeight: 600 }}>
                {lighting.icon} {lighting.tempLabel}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: 10 }}>
            <button
              onClick={() => setGameTime(7 * 60)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #fde68a', backgroundColor: '#fffbeb',
                color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
              }}
            >
              🌅 07:00 Pagi (Warm)
            </button>
            <button
              onClick={() => setGameTime(12 * 60)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #bae6fd', backgroundColor: '#f0f9ff',
                color: '#0369a1', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
              }}
            >
              ☀️ 12:00 Siang (Cool)
            </button>
            <button
              onClick={() => setGameTime(17 * 60)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #fed7aa', backgroundColor: '#fff7ed',
                color: '#c2410c', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
              }}
            >
              🌇 17:00 Sore (Warm)
            </button>
            <button
              onClick={() => setGameTime(21 * 60)}
              style={{
                padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#0f172a',
                color: '#f8fafc', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
              }}
            >
              🌙 21:00 Malam (Warm)
            </button>
          </div>
          {lighting && (
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: lighting.ceilingColor, border: '1px solid #94a3b8', display: 'inline-block' }}></span>
                <span>Neon Langit-langit (RectAreaLight): <strong>{lighting.ceilingColor}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: lighting.deskColor, border: '1px solid #94a3b8', display: 'inline-block' }}></span>
                <span>Lampu Meja Kerja (PointLight): <strong>{lighting.deskColor}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
        <p style={{ fontSize: 12, color: '#0369a1', margin: 0, lineHeight: 1.5 }}>
          <strong>Info:</strong> Jadwal rutinitas NPC (standup, istirahat, pulang) akan mengikuti jam kerja ini.
        </p>
      </div>
    </div>
  );
};

export default SettingsBox;
