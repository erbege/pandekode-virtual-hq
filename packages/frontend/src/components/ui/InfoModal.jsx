import React, { useState, useEffect } from 'react';

const InfoModal = ({ info, onClose }) => {
  const [content, setContent] = useState(info?.content || "");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!info) return;
    fetch('http://localhost:3000/api/infoboard')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if ((info.title === "PENGUMUMAN" || info.title === "ANNOUNCEMENTS") && data.note) {
            setContent(data.note);
          } else if (info.title === "TO-DO LIST" && data.todoList) {
            setContent(data.todoList);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [info]);

  if (!info) return null;
  const isAnnouncement = info.title === "PENGUMUMAN" || info.title === "ANNOUNCEMENTS";
  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{
        width: '400px', padding: '24px', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '16px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
            {isAnnouncement ? "📢 " : "📝 "} 
            {info.title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✖</button>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155', fontSize: '15px' }}>
          {isLoading ? <span style={{color: '#9ca3af', fontStyle: 'italic'}}>Memuat...</span> : content}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
