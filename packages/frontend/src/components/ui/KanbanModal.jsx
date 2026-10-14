import React, { useState, useEffect } from 'react';
import useInteractionStore, { normalizeAssignee } from '../../stores/useInteractionStore';
import { initialNPCs } from '../../data/npcProfiles';

const KanbanModal = ({ onClose }) => {
  const [kanbanData, setKanbanData] = useState({ todo: [], inProgress: [], review: [], done: [] });
  const [isLoading, setIsLoading] = useState(true);
  const setStoreKanban = useInteractionStore(state => state.setKanbanData);
  const npcMoods = useInteractionStore(state => state.npcMoods);

  useEffect(() => {
    fetch('http://localhost:3000/api/kanban')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setKanbanData(data);
          setStoreKanban(data);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [setStoreKanban]);

  const renderCards = (tasks) => {
    if (!tasks || tasks.length === 0) return <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic', padding: 12 }}>Tidak ada task</div>;
    return tasks.map(task => {
      const npcId = normalizeAssignee(task.assignee);
      const mood = npcId && npcMoods ? npcMoods[npcId] : null;

      return (
        <div key={task.id} className="kanban-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{task.tag}</span>
            {mood && (
              <span 
                title={`Mood: ${mood.mood === 'stressed' ? 'Stres' : mood.mood === 'neutral' ? 'Fokus' : 'Bahagia'}`}
                style={{ fontSize: '12px' }}
              >
                {mood.emoji}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '12px', lineHeight: 1.4 }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: initialNPCs[npcId]?.color || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', color: 'white' }}>
              {task.assignee.charAt(0)}
            </div>
            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{task.assignee}</span>
          </div>
        </div>
      );
    });
  };


  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{
        width: '90%', maxWidth: '1100px', height: '85%',
        padding: '32px', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '20px', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span> Board Proyek Klien
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#1e293b'} onMouseOut={(e) => e.target.style.color = '#94a3b8'}>
            ✖
          </button>
        </div>

        {/* --- TEAM MOOD & WORKLOAD SUMMARY BAR --- */}
        {!isLoading && npcMoods && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(248, 250, 252, 0.8)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 16px',
            marginBottom: '16px',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
              whiteSpace: 'nowrap'
            }}>
              Mood Tim:
            </span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {Object.entries(initialNPCs).map(([id, npc]) => {
                const mood = npcMoods[id];
                if (!mood) return null;
                return (
                  <div
                    key={id}
                    title={`${npc.fullName}: ${mood.reason}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'white',
                      border: `1px solid ${mood.color}60`,
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: npc.color
                    }} />
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {npc.name.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '13px' }}>{mood.emoji}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: mood.color,
                      background: `${mood.color}15`,
                      padding: '1px 5px',
                      borderRadius: '8px'
                    }}>
                      {mood.activeCount || 0} task
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#64748b', fontSize: 16 }}>Memuat data Kanban...</div>
        ) : (
          <div className="kanban-board">

            <div className="kanban-column">
              <h3 style={{ margin: 0, color: '#475569', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                To Do <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{kanbanData.todo?.length || 0}</span>
              </h3>
              {renderCards(kanbanData.todo)}
            </div>
            <div className="kanban-column">
              <h3 style={{ margin: 0, color: '#d97706', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                In Progress <span style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{kanbanData.inProgress?.length || 0}</span>
              </h3>
              {renderCards(kanbanData.inProgress)}
            </div>
            <div className="kanban-column">
              <h3 style={{ margin: 0, color: '#2563eb', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                Review <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{kanbanData.review?.length || 0}</span>
              </h3>
              {renderCards(kanbanData.review)}
            </div>
            <div className="kanban-column">
              <h3 style={{ margin: 0, color: '#059669', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                Done <span style={{ background: '#d1fae5', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>{kanbanData.done?.length || 0}</span>
              </h3>
              {renderCards(kanbanData.done)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanModal;
