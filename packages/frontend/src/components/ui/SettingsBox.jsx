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
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'visual' | 'schedule'

  // State Konfigurasi AI Provider & API Key
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModelName, setAiModelName] = useState('gemini-3.5-flash-lite');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isAiSaving, setIsAiSaving] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  const defaultModels = {
    gemini: 'gemini-3.5-flash-lite',
    openai: 'gpt-4o-mini',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'meta-llama/llama-3.3-70b-instruct',
    custom: 'llama3'
  };

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3000/api/config/ai')
        .then(res => res.json())
        .then(data => {
          if (data) {
            setAiProvider(data.provider || 'gemini');
            let mName = data.modelName || defaultModels[data.provider || 'gemini'] || 'gemini-3.5-flash-lite';
            if (mName === 'gemini-2.5-flash' || mName === 'gemini-1.5-flash') mName = 'gemini-3.5-flash-lite';
            setAiModelName(mName);
            setAiBaseUrl(data.baseUrl || '');
            setIsKeyConfigured(Boolean(data.isKeyConfigured));
            setMaskedKey(data.maskedApiKey || '');
          }
        })
        .catch(err => console.warn("Gagal mengambil config AI:", err));
    }
  }, [isOpen]);

  const handleProviderChange = (newProvider) => {
    setAiProvider(newProvider);
    setAiModelName(defaultModels[newProvider] || '');
    if (newProvider === 'openrouter' && !aiBaseUrl) {
      setAiBaseUrl('https://openrouter.ai/api/v1');
    } else if (newProvider === 'custom' && !aiBaseUrl) {
      setAiBaseUrl('http://localhost:11434/v1');
    }
    setAiFeedback(null);
  };

  const handleSaveAiConfig = async () => {
    setIsAiSaving(true);
    setAiFeedback(null);
    try {
      const res = await fetch('http://localhost:3000/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey: aiApiKey,
          modelName: aiModelName,
          baseUrl: aiBaseUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIsKeyConfigured(data.isKeyConfigured);
        if (aiApiKey) {
          setMaskedKey(aiApiKey.length > 8 ? `${aiApiKey.slice(0, 4)}••••${aiApiKey.slice(-4)}` : '••••');
          setAiApiKey('');
        }
        setAiFeedback({ type: 'success', text: '✅ ' + (data.message || 'Tersimpan!') });
      } else {
        setAiFeedback({ type: 'error', text: '❌ ' + (data.error || 'Gagal menyimpan.') });
      }
    } catch (err) {
      setAiFeedback({ type: 'error', text: '❌ ' + err.message });
    } finally {
      setIsAiSaving(false);
    }
  };

  const handleTestAi = async () => {
    setIsAiTesting(true);
    setAiFeedback({ type: 'info', text: '⏳ Menguji ' + aiProvider.toUpperCase() + '...' });
    try {
      const res = await fetch('http://localhost:3000/api/config/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setAiFeedback({ type: 'success', text: `🟢 OK! Respon: "${data.reply}"` });
      } else {
        setAiFeedback({ type: 'error', text: '❌ ' + (data.error || 'Gagal terhubung.') });
      }
    } catch (err) {
      setAiFeedback({ type: 'error', text: '❌ ' + err.message });
    } finally {
      setIsAiTesting(false);
    }
  };

  const toggleEffect = (key) => {
    if (setPostFxSettings) {
      setPostFxSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const activeEffectsCount = [
    postFxSettings?.bloom ?? true,
    postFxSettings?.ssao ?? true,
    postFxSettings?.vignette ?? true,
    postFxSettings?.toneMapping ?? true
  ].filter(Boolean).length;

  const allEffectsEnabled = activeEffectsCount === 4;
  const someEffectsEnabled = activeEffectsCount > 0;

  const masterCheckboxRef = useRef(null);
  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = someEffectsEnabled && !allEffectsEnabled;
    }
  }, [someEffectsEnabled, allEffectsEnabled]);

  const toggleAllEffects = () => {
    if (setPostFxSettings) {
      const target = !allEffectsEnabled;
      setPostFxSettings({ bloom: target, ssao: target, vignette: target, toneMapping: target });
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="chat-send-btn"
        style={{
          position: 'absolute', bottom: 20, right: 20, width: 44, height: 44,
          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
          fontSize: 18, zIndex: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s ease'
        }}
        title="Buka Pengaturan"
      >
        ⚙️
      </button>
    );
  }

  return (
    <div className="glass-panel" style={{
      position: 'absolute', bottom: 20, right: 20, width: 340, maxHeight: 'min(84vh, 560px)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 16px', fontFamily: 'Inter, sans-serif', zIndex: 10, color: '#1e293b',
      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)', border: '1px solid rgba(255,255,255,0.7)',
      borderRadius: '16px', backgroundColor: 'rgba(255, 255, 255, 0.92)'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, color: '#0f172a' }}>
          <span>⚙️</span>
          <span>Pengaturan</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)} 
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', 
            fontSize: 16, padding: '2px 6px', borderRadius: 6, lineHeight: 1 
          }}
          title="Tutup"
        >
          ✕
        </button>
      </div>

      {/* Segmented Pill Tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        padding: 3, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 12
      }}>
        {[
          { id: 'ai', label: '🤖 AI' },
          { id: 'visual', label: '✨ Visual' },
          { id: 'schedule', label: '⏰ Jadwal' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setAiFeedback(null); }}
            style={{
              padding: '5px 0', fontSize: 11, fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: 6, border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(59, 130, 246, 0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {/* ================= TAB 1: AI PROVIDER ================= */}
        {activeTab === 'ai' && (
          <>
            {/* Header Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>Provider & Model</span>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10,
                backgroundColor: isKeyConfigured || aiProvider === 'custom' ? '#dcfce7' : '#fef3c7',
                color: isKeyConfigured || aiProvider === 'custom' ? '#15803d' : '#b45309',
                fontWeight: 600
              }}>
                {isKeyConfigured || aiProvider === 'custom' ? '🟢 Aktif' : '🟡 Standar / Offline'}
              </span>
            </div>

            {/* Provider Dropdown */}
            <div>
              <select 
                value={aiProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6,
                  border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: 11, fontWeight: 600,
                  color: '#0f172a', outline: 'none'
                }}
              >
                <option value="gemini">Google Gemini (Bawaan)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="groq">Groq (Llama 3.3 - Cepat)</option>
                <option value="openrouter">OpenRouter (Multi-model)</option>
                <option value="custom">Ollama / Local (Offline)</option>
              </select>
            </div>

            {/* API Key Field */}
            {aiProvider !== 'custom' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                    API Key:
                  </label>
                  {maskedKey && (
                    <span style={{ fontSize: 10, color: '#64748b' }}>Ada: {maskedKey}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input 
                    type={showKey ? "text" : "password"}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={maskedKey ? "Ganti key tersimpan..." : "Tempel API key..."}
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                      fontSize: 11, color: '#0f172a', outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: 11, color: '#475569'
                    }}
                    title={showKey ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showKey ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '6px 8px', backgroundColor: '#f1f5f9', borderRadius: 6, fontSize: 10, color: '#475569' }}>
                💡 <strong>Ollama Local:</strong> Tidak memerlukan API key. Pastikan Ollama berjalan di komputer Anda.
              </div>
            )}

            {/* Model Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                Model ID:
              </label>
              <input 
                type="text"
                value={aiModelName}
                onChange={(e) => setAiModelName(e.target.value)}
                placeholder={defaultModels[aiProvider] || 'Nama model...'}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6,
                  border: '1px solid #cbd5e1', fontSize: 11, color: '#0f172a', outline: 'none'
                }}
              />
            </div>

            {/* Base URL (if custom or openrouter) */}
            {(aiProvider === 'custom' || aiProvider === 'openrouter') && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                  Base URL:
                </label>
                <input 
                  type="text"
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder={aiProvider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'http://localhost:11434/v1'}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6,
                    border: '1px solid #cbd5e1', fontSize: 11, color: '#0f172a', outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Feedback Pesan */}
            {aiFeedback && (
              <div style={{
                padding: '5px 8px', borderRadius: 6, fontSize: 10, lineHeight: 1.3,
                backgroundColor: aiFeedback.type === 'success' ? '#dcfce7' : aiFeedback.type === 'info' ? '#e0f2fe' : '#fee2e2',
                color: aiFeedback.type === 'success' ? '#166534' : aiFeedback.type === 'info' ? '#0369a1' : '#991b1b',
                border: '1px solid ' + (aiFeedback.type === 'success' ? '#bbf7d0' : aiFeedback.type === 'info' ? '#bae6fd' : '#fecaca')
              }}>
                {aiFeedback.text}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <button
                type="button"
                onClick={handleSaveAiConfig}
                disabled={isAiSaving}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                  backgroundColor: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700,
                  cursor: isAiSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isAiSaving ? 'Menyimpan...' : '💾 Simpan'}
              </button>
              <button
                type="button"
                onClick={handleTestAi}
                disabled={isAiTesting || (!isKeyConfigured && !aiApiKey && aiProvider !== 'custom')}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc', color: '#334155', fontSize: 11, fontWeight: 600,
                  cursor: (isAiTesting || (!isKeyConfigured && !aiApiKey && aiProvider !== 'custom')) ? 'not-allowed' : 'pointer'
                }}
              >
                {isAiTesting ? 'Menguji...' : '⚡ Tes'}
              </button>
            </div>
          </>
        )}

        {/* ================= TAB 2: VISUAL & GRAFIS ================= */}
        {activeTab === 'visual' && (
          <>
            {/* Master Toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 9px', borderRadius: 8, cursor: 'pointer',
              backgroundColor: allEffectsEnabled ? 'rgba(59, 130, 246, 0.08)' : '#f8fafc',
              border: '1px solid ' + (allEffectsEnabled ? 'rgba(59, 130, 246, 0.25)' : '#e2e8f0'),
              transition: 'all 0.15s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  ref={masterCheckboxRef}
                  type="checkbox" 
                  checked={allEffectsEnabled}
                  onChange={toggleAllEffects}
                  style={{ width: 15, height: 15, accentColor: '#3b82f6', cursor: 'pointer', margin: 0 }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>Semua Efek Visual</span>
              </div>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                backgroundColor: allEffectsEnabled ? '#dcfce7' : someEffectsEnabled ? '#fef3c7' : '#f1f5f9',
                color: allEffectsEnabled ? '#15803d' : someEffectsEnabled ? '#b45309' : '#64748b',
                fontWeight: 600
              }}>
                {activeEffectsCount}/4 Aktif
              </span>
            </label>

            {/* 2x2 Grid Efek */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[
                { key: 'bloom', name: 'Bloom', desc: 'Glow neon' },
                { key: 'ssao', name: 'SSAO', desc: 'Bayangan ruang' },
                { key: 'vignette', name: 'Vignette', desc: 'Fokus tepi' },
                { key: 'toneMapping', name: 'ToneMapping', desc: 'Warna ACES' }
              ].map(fx => {
                const isChecked = postFxSettings?.[fx.key] ?? true;
                return (
                  <label 
                    key={fx.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                      padding: '5px 7px', borderRadius: 6,
                      backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                      border: '1px solid ' + (isChecked ? '#bbf7d0' : '#e2e8f0')
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleEffect(fx.key)}
                      style={{ width: 14, height: 14, accentColor: '#16a34a', margin: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{fx.name}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{fx.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Preset Pencahayaan & Waktu */}
            {setGameTime && (
              <div style={{ marginTop: 2, padding: '8px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>Preset Suasana</span>
                  {lighting && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, backgroundColor: lighting.isCool ? '#e0f2fe' : '#fef3c7', color: lighting.isCool ? '#0369a1' : '#b45309', fontWeight: 600 }}>
                      {lighting.icon} {lighting.tempLabel}
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
                  <button
                    onClick={() => setGameTime(7 * 60)}
                    style={{
                      padding: '5px 6px', borderRadius: 6, border: '1px solid #fde68a', backgroundColor: '#fffbeb',
                      color: '#92400e', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    🌅 07:00 Pagi
                  </button>
                  <button
                    onClick={() => setGameTime(12 * 60)}
                    style={{
                      padding: '5px 6px', borderRadius: 6, border: '1px solid #bae6fd', backgroundColor: '#f0f9ff',
                      color: '#0369a1', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ☀️ 12:00 Siang
                  </button>
                  <button
                    onClick={() => setGameTime(17 * 60)}
                    style={{
                      padding: '5px 6px', borderRadius: 6, border: '1px solid #fed7aa', backgroundColor: '#fff7ed',
                      color: '#c2410c', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    🌇 17:00 Sore
                  </button>
                  <button
                    onClick={() => setGameTime(21 * 60)}
                    style={{
                      padding: '5px 6px', borderRadius: 6, border: '1px solid #cbd5e1', backgroundColor: '#0f172a',
                      color: '#f8fafc', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    🌙 21:00 Malam
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= TAB 3: JADWAL & WAKTU ================= */}
        {activeTab === 'schedule' && (
          <>
            {/* Mode Waktu */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 3, color: '#475569' }}>
                Mode Waktu Game:
              </label>
              <select 
                value={timeMode} 
                onChange={(e) => setTimeMode(e.target.value)}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1',
                  backgroundColor: '#fff', fontSize: 11, color: '#0f172a', outline: 'none'
                }}
              >
                <option value="simulated">Fast Forward (1 Menit/Detik)</option>
                <option value="realtime">Real-Time (Waktu Nyata)</option>
              </select>
            </div>

            {/* Toggle Siklus Kerja */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              backgroundColor: '#f8fafc', padding: '7px 9px', borderRadius: 8, border: '1px solid #e2e8f0'
            }}>
              <input 
                type="checkbox" 
                checked={workingHoursEnabled}
                onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: '#3b82f6', margin: 0 }}
              />
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>Aktifkan Siklus Kerja</span>
                <div style={{ fontSize: 9, color: '#64748b' }}>
                  {workingHoursEnabled ? 'NPC beristirahat & pulang' : 'NPC selalu bekerja 24/7'}
                </div>
              </div>
            </label>

            {/* Jam Masuk & Jam Pulang (2-col) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, marginBottom: 2, color: '#475569' }}>
                  Jam Masuk (0-23):
                </label>
                <input 
                  type="number" min="0" max="23" value={startTime} 
                  onChange={(e) => setStartTime(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6,
                    border: '1px solid #cbd5e1', fontSize: 11, outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, marginBottom: 2, color: '#475569' }}>
                  Jam Pulang (0-23):
                </label>
                <input 
                  type="number" min="0" max="23" value={endTime} 
                  onChange={(e) => setEndTime(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6,
                    border: '1px solid #cbd5e1', fontSize: 11, outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Info Box */}
            <div style={{ padding: '6px 8px', backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
              <p style={{ fontSize: 10, color: '#0369a1', margin: 0, lineHeight: 1.4 }}>
                💡 <strong>Info:</strong> Jadwal rutinitas NPC (standup, makan siang, pulang) otomatis mengikuti jam ini.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default SettingsBox;
