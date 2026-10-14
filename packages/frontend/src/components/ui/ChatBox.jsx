import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initialNPCs } from '../../data/npcProfiles';
import useInteractionStore, { getAffinityTier } from '../../stores/useInteractionStore';

const NPC_DISPLAY_NAMES = {
  ceo: "Bege (CEO)",
  agung: "Agung (CTO/PM)",
  bunga: "Bunga (UI/UX)",
  candra: "Candra (FE)",
  dika: "Dika (BE)",
  eka: "Eka (QA)",
  fajar: "Fajar (DevOps)",
  gita: "Gita (Reception)",
  hadi: "Hadi (OB)",
};

const ChatBox = ({ 
  onDetectIntent, 
  onSpeech, 
  controlledNpcId, 
  onReportGenerated, 
  onChatToggle, 
  latestPositionsRef,
  npcState 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const npcMoods = useInteractionStore(state => state.npcMoods);
  const playerAffinity = useInteractionStore(state => state.playerAffinity);
  const incrementChatCount = useInteractionStore(state => state.incrementChatCount);
  const addNpcAffinity = useInteractionStore(state => state.addNpcAffinity);

  // Filter HANYA NPC yang saat ini berada di kantor (visible === true)
  // dan bukan karakter yang sedang dikontrol oleh pemain
  const visibleNpcs = useMemo(() => {

    if (!npcState) {
      return Object.entries(initialNPCs)
        .filter(([id]) => id !== controlledNpcId)
        .map(([id, state]) => ({
          id,
          name: NPC_DISPLAY_NAMES[id] || state.name,
          role: state.role,
          color: state.color,
          traits: state.traits
        }));
    }

    return Object.entries(npcState)
      .filter(([id, state]) => id !== controlledNpcId && Boolean(state?.visible))
      .map(([id, state]) => ({
        id,
        name: NPC_DISPLAY_NAMES[id] || state.name || initialNPCs[id]?.name || id,
        role: state.role || initialNPCs[id]?.role || '',
        color: state.color || initialNPCs[id]?.color || '#64748b',
        traits: state.traits || initialNPCs[id]?.traits || []
      }));
  }, [npcState, controlledNpcId]);

  // Target chat aktif: "all" jika > 1 NPC, ID NPC tunggal jika = 1 NPC, atau "" jika kosong
  const [activeNpc, setActiveNpc] = useState(() => {
    if (visibleNpcs.length > 1) return "all";
    if (visibleNpcs.length === 1) return visibleNpcs[0].id;
    return "";
  });

  // Sinkronisasi otomatis activeNpc saat daftar NPC yang ada di kantor berubah (masuk kantor / pulang)
  useEffect(() => {
    if (visibleNpcs.length === 0) {
      if (activeNpc !== "") setActiveNpc("");
    } else if (visibleNpcs.length === 1) {
      // Hanya ada 1 NPC di kantor: opsi Broadcast tidak muncul, otomatis pilih satu-satunya NPC
      if (activeNpc !== visibleNpcs[0].id) {
        setActiveNpc(visibleNpcs[0].id);
      }
    } else {
      // Ada lebih dari 1 NPC di kantor: opsi "all" (Broadcast) valid, atau salah satu visibleNpc
      const isValid = activeNpc === "all" || visibleNpcs.some(n => n.id === activeNpc);
      if (!isValid) {
        setActiveNpc("all");
      }
    }
  }, [visibleNpcs, activeNpc]);

  const visibleNpcsRef = useRef(visibleNpcs);
  useEffect(() => {
    visibleNpcsRef.current = visibleNpcs;
  }, [visibleNpcs]);

  useEffect(() => {
    if (onChatToggle) {
      onChatToggle(isOpen);
    }
  }, [isOpen, onChatToggle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 50); 
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key.toLowerCase() === 't' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault(); 
        setIsOpen(true);
      }
    };
    
    const handleOpenChat = (e) => {
      const targetId = e.detail?.npcId;
      if (targetId && visibleNpcsRef.current.some(n => n.id === targetId)) {
        setActiveNpc(targetId);
      }
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('openChatWithNpc', handleOpenChat);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('openChatWithNpc', handleOpenChat);
    };
  }, []);

  const fetchChat = async (npcId, message) => {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "pemain-1", npcId, message })
    });
    return res.json();
  };

  const processResponse = async (data, currentNpcId) => {
    setMessages(prev => [...prev, { sender: data.sender || currentNpcId, text: data.reply }]);
    
    if (onSpeech) onSpeech(currentNpcId, data.reply);

    if (data.action.startsWith("GO_TO_")) {
      onDetectIntent(currentNpcId, data.action);
    } else if (data.action === "KANBAN") {
      onDetectIntent(currentNpcId, "GO_TO_MEETINGROOM");
    } else if (data.action === "DESK") {
      onDetectIntent(currentNpcId, "GO_TO_STAFFROOM");
    }

    if (data.action === "ASK_NPC" && data.targetNpc && data.messageToTarget) {
      const target = data.targetNpc.toLowerCase();
      const isTargetInOffice = visibleNpcsRef.current.some(n => n.id === target);

      if (!isTargetInOffice) {
        setMessages(prev => [...prev, { 
          sender: 'Sistem', 
          text: `${data.sender || currentNpcId} tidak dapat menyampaikan pesan karena ${NPC_DISPLAY_NAMES[target] || target} sedang tidak berada di kantor.` 
        }]);
        return;
      }
      
      // 1. Suruh NPC A menghampiri NPC B
      onDetectIntent(currentNpcId, `GO_TO_NPC_${target.toUpperCase()}`);
      setMessages(prev => [...prev, { sender: 'Sistem', text: `${data.sender || currentNpcId} sedang menghampiri ${target}...` }]);
      
      // 2. Cek jarak setiap 500ms (Maksimal tunggu 20 detik)
      let waitTicks = 40;
      const checkInterval = setInterval(async () => {
        waitTicks--;
        const posA = latestPositionsRef?.current?.[currentNpcId === 'ceo' ? 'player' : currentNpcId];
        const posB = latestPositionsRef?.current?.[target === 'ceo' ? 'player' : target];
        
        let reached = false;
        if (posA && posB) {
          const dx = posA[0] - posB[0];
          const dz = posA[2] - posB[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist <= 2.0) reached = true;
        }

        if (reached || waitTicks <= 0) {
          clearInterval(checkInterval);
          
          if (reached) {
            setMessages(prev => [...prev, { sender: data.sender || currentNpcId, text: `[Menyampaikan ke ${target}]: ${data.messageToTarget}` }]);
            if (onSpeech) onSpeech(currentNpcId, data.messageToTarget);
            addNpcAffinity(currentNpcId, target, 4);
            
            try {

              const targetData = await fetchChat(target, data.messageToTarget);
              await processResponse(targetData, target);
            } catch (err) {
              console.error(err);
            }
          } else {
            setMessages(prev => [...prev, { sender: 'Sistem', text: `${data.sender || currentNpcId} menyerah, tidak bisa mencapai ${target} (terhalang / terlalu jauh).` }]);
          }

          // 3. Setelah 8 detik dari kejadian, kembali ke meja
          setTimeout(() => {
            onDetectIntent(currentNpcId, "DESK");
          }, 8000);
        }
      }, 500);
      
      return;
    }
    
    if (data.action === "GENERATE_REPORT" && onReportGenerated) {
      onReportGenerated(data);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (visibleNpcs.length === 0) {
      setMessages(prev => [...prev, { 
        sender: 'Sistem', 
        text: "Tidak ada NPC di kantor yang dapat menerima pesan saat ini." 
      }]);
      return;
    }

    const userMessage = input;
    setMessages(prev => [...prev, { sender: 'Anda', text: userMessage }]);
    setInput("");
    setIsLoading(true);

    // Track chat count & Player-NPC affinity
    if (activeNpc === "all") {
      visibleNpcs.forEach(n => incrementChatCount(n.id));
    } else if (activeNpc) {
      incrementChatCount(activeNpc);
    }

    const visibleIds = visibleNpcs.map(n => n.id);

    // Deteksi cepat instruksi summon / navigasi langsung oleh CEO / Player (Hanya untuk NPC yang ada di kantor)
    const lowerMsg = userMessage.toLowerCase();
    const allNpcKeys = ["agung", "bunga", "candra", "dika", "eka", "fajar", "gita", "hadi"];
    const mentionedNpc = allNpcKeys.find(k => lowerMsg.includes(k));

    if (lowerMsg.includes("ke ruangan saya") || lowerMsg.includes("ke ruang saya") || lowerMsg.includes("ke ruang ceo") || lowerMsg.includes("menghadap") || lowerMsg.includes("masuk ruangan")) {
      const targetIds = (lowerMsg.includes("semua") 
        ? visibleIds 
        : [mentionedNpc || (activeNpc !== 'all' ? activeNpc : visibleIds[0])])
        .filter(id => visibleIds.includes(id));

      targetIds.forEach(tId => {
        if (tId && onDetectIntent) onDetectIntent(tId, "GO_TO_CEOROOM");
      });
    } else if (lowerMsg.includes("ke lobi") || lowerMsg.includes("kumpul di lobi") || lowerMsg.includes("ngobrol sama gita")) {
      const targetIds = (lowerMsg.includes("semua") 
        ? ["candra", "bunga", "eka", "dika", "fajar"] 
        : [mentionedNpc || (activeNpc !== 'all' ? activeNpc : 'bunga')])
        .filter(id => visibleIds.includes(id));

      targetIds.forEach(tId => {
        if (tId && onDetectIntent) onDetectIntent(tId, "GO_TO_LOBBY");
      });
    } else if (lowerMsg.includes("submit report") || lowerMsg.includes("lapor ke ceo") || lowerMsg.includes("serahkan laporan")) {
      if (visibleIds.includes("agung") && onDetectIntent) onDetectIntent("agung", "AGUNG_REPORT_TO_CEO");
    } else if (lowerMsg.includes("rapikan meja ceo") || lowerMsg.includes("bersihkan meja ceo") || lowerMsg.includes("rapikan ruang ceo")) {
      if (visibleIds.includes("hadi") && onDetectIntent) onDetectIntent("hadi", "HADI_TIDY_CEO_DESK");
    } else if (lowerMsg.includes("ambil gelas") && lowerMsg.includes("ceo")) {
      if (visibleIds.includes("hadi") && onDetectIntent) onDetectIntent("hadi", "HADI_DESK_6_COLLECT");
    } else if (lowerMsg.includes("kulkas") || lowerMsg.includes("minuman dingin") || lowerMsg.includes("ambil minum")) {
      const targetIds = (lowerMsg.includes("semua") 
        ? ["candra", "bunga", "eka", "dika", "fajar"] 
        : [mentionedNpc || (activeNpc !== 'all' ? activeNpc : 'dika')])
        .filter(id => visibleIds.includes(id));

      targetIds.forEach(tId => {
        if (tId && onDetectIntent) onDetectIntent(tId, "GET_COLD_DRINK");
      });
    } else if (lowerMsg.includes("bikin kopi") || lowerMsg.includes("seduh kopi") || lowerMsg.includes("mesin kopi") || lowerMsg.includes("buat kopi")) {
      if ((mentionedNpc === "hadi" || lowerMsg.includes("hadi")) && visibleIds.includes("hadi")) {
        if (onDetectIntent) onDetectIntent("hadi", "HADI_BREW_COFFEE");
      } else {
        const targetIds = (lowerMsg.includes("semua") 
          ? ["candra", "fajar", "dika"] 
          : [mentionedNpc || (activeNpc !== 'all' ? activeNpc : 'candra')])
          .filter(id => visibleIds.includes(id));

        targetIds.forEach(tId => {
          if (tId && onDetectIntent) onDetectIntent(tId, "BREW_COFFEE");
        });
      }
    }

    try {
      if (activeNpc === "all" && visibleNpcs.length > 1) {
        // Broadcast HANYA ke seluruh NPC yang saat ini hadir di kantor
        const promises = visibleNpcs.map(async (npc) => {
          const data = await fetchChat(npc.id, userMessage);
          if (data.reply) await processResponse(data, npc.id);
        });
        await Promise.all(promises);
      } else {
        const targetNpcId = activeNpc === "all" ? visibleNpcs[0]?.id : activeNpc;
        if (!targetNpcId || !visibleIds.includes(targetNpcId)) {
          setMessages(prev => [...prev, { 
            sender: 'Sistem', 
            text: `${NPC_DISPLAY_NAMES[targetNpcId] || targetNpcId || "NPC"} sedang tidak berada di kantor.` 
          }]);
          setIsLoading(false);
          return;
        }

        const data = await fetchChat(targetNpcId, userMessage);
        if (data.reply) {
          await processResponse(data, targetNpcId);
        } else {
          setMessages(prev => [...prev, { sender: 'Sistem', text: "Gagal memuat balasan dari AI." }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'Sistem', text: "Koneksi ke server terputus." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="chat-send-btn"
        style={{
          position: 'absolute', bottom: 20, left: 20, width: 60, height: 60,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
          fontSize: 28, zIndex: 10
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat-container glass-panel" style={{
      position: 'absolute', bottom: 20, left: 20, width: 380, height: 500,
      zIndex: 10
    }}>
      <div className="chat-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <select 
            value={activeNpc} 
            onChange={(e) => setActiveNpc(e.target.value)}
            disabled={visibleNpcs.length === 0}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0', 
              fontSize: 14, 
              fontFamily: 'Inter, sans-serif', 
              outline: 'none', 
              flex: 1, 
              marginRight: '10px',
              backgroundColor: visibleNpcs.length === 0 ? '#f8fafc' : '#ffffff',
              color: visibleNpcs.length === 0 ? '#94a3b8' : '#1e293b',
              cursor: visibleNpcs.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            {/* Opsi Broadcast HANYA jika ada lebih dari 1 NPC di kantor */}
            {visibleNpcs.length > 1 && (
              <option value="all">Semua (Broadcast)</option>
            )}

            {/* Daftar NPC yang saat ini ada di kantor */}
            {visibleNpcs.length > 0 ? (
              visibleNpcs.map((npc) => {
                const mood = npcMoods ? npcMoods[npc.id] : null;
                const pts = playerAffinity ? (playerAffinity[npc.id] || 0) : 0;
                const tier = getAffinityTier(pts);
                return (
                  <option key={npc.id} value={npc.id}>
                    {npc.name} {mood ? mood.emoji : ''} ({tier.emoji} Lv.{tier.level})
                  </option>
                );
              })
            ) : (
              <option value="" disabled>Tidak ada NPC di kantor</option>
            )}
          </select>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
          >
            ✖
          </button>
        </div>

        {/* Info Badge NPC Terpilih: Menampilkan Mood & Tingkat Afinitas */}
        {activeNpc !== "all" && activeNpc !== "" && initialNPCs[activeNpc] && (
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#475569', 
            background: 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: '8px', 
            border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: initialNPCs[activeNpc].color, display: 'inline-block', flexShrink: 0 }}></span>
              <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>{initialNPCs[activeNpc].role}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {npcMoods && npcMoods[activeNpc] && (
                <span 
                  title={`Mood: ${npcMoods[activeNpc].reason}`}
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: npcMoods[activeNpc].color,
                    background: `${npcMoods[activeNpc].color}15`,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {npcMoods[activeNpc].emoji} {npcMoods[activeNpc].mood === 'stressed' ? 'Stres' : npcMoods[activeNpc].mood === 'neutral' ? 'Fokus' : 'Happy'}
                </span>
              )}
              {playerAffinity && (
                <span 
                  title={`Afinitas: ${getAffinityTier(playerAffinity[activeNpc] || 0).title}`}
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: getAffinityTier(playerAffinity[activeNpc] || 0).color,
                    background: `${getAffinityTier(playerAffinity[activeNpc] || 0).color}15`,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {getAffinityTier(playerAffinity[activeNpc] || 0).emoji} Lv.{getAffinityTier(playerAffinity[activeNpc] || 0).level}
                </span>
              )}
            </div>
          </div>
        )}


        {/* Info Badge Broadcast Mode */}
        {activeNpc === "all" && visibleNpcs.length > 1 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4338ca', 
            background: 'rgba(238,242,255,0.8)', padding: '5px 10px', borderRadius: '8px', 
            border: '1px solid rgba(199,210,254,0.9)', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' 
          }}>
            <span style={{ fontSize: '12px' }}>📢</span>
            <span style={{ fontWeight: 600 }}>Broadcast ke {visibleNpcs.length} NPC di kantor</span>
          </div>
        )}

        {/* Info Badge Saat Kantor Kosong */}
        {visibleNpcs.length === 0 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', 
            background: 'rgba(241,245,249,0.8)', padding: '5px 10px', borderRadius: '8px', 
            border: '1px solid rgba(203,213,225,0.8)' 
          }}>
            <span>🌙</span>
            <span>Semua NPC sedang di luar kantor (pulang / libur)</span>
          </div>
        )}
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginTop: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            Kirim pesan untuk mulai kolaborasi...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.sender === 'Anda' ? 'user' : 'npc'}`}>
            <div style={{ fontSize: 11, marginBottom: 4, opacity: msg.sender === 'Anda' ? 0.9 : 0.6, fontWeight: 600 }}>
              {msg.sender}
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-bubble npc" style={{ fontStyle: 'italic', color: '#64748b' }}>
            {activeNpc === "all" ? "Tim" : (NPC_DISPLAY_NAMES[activeNpc] || activeNpc)} sedang mengetik...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-area">
        <input 
          ref={inputRef}
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder={visibleNpcs.length === 0 ? "Tidak ada NPC di kantor saat ini..." : "Ketik instruksi... (Esc u/ tutup)"} 
          disabled={visibleNpcs.length === 0}
          className="chat-input"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
        />
        <button type="submit" disabled={isLoading || visibleNpcs.length === 0} className="chat-send-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
