import React from 'react';

const ReportModal = ({ projectReport, onClose }) => {
  if (!projectReport) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{
        width: '80%', maxWidth: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        padding: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e293b', fontSize: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📑</span> Laporan Proyek: {projectReport.title}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✖</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }}>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: '#334155', fontSize: '15px', backgroundColor: 'rgba(255,255,255,0.5)', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {projectReport.content}
          </div>
        </div>
        
        <div style={{ marginTop: '24px', textAlign: 'right', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '20px' }}>
          <button 
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '12px 32px' }}
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
