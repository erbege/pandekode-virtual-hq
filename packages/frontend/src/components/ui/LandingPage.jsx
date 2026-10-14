import React from 'react';
import SettingsBox from './SettingsBox';

const LandingPage = ({ 
  onStart, 
  timeMode, setTimeMode, 
  startTime, setStartTime, 
  endTime, setEndTime, 
  workingHoursEnabled, setWorkingHoursEnabled,
  postFxSettings, setPostFxSettings
}) => {
  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 className="landing-title">PANDEKODE HQ</h1>
        <h2 className="landing-subtitle">A Place Where Your Code Comes to Life</h2>
        <button
          onClick={onStart}
          className="btn-primary"
        >
          Let's Start Coding
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: '20px', fontSize: '14px', color: '#9ca3af' }}>
        &copy; Created by PANDEKODE
      </div>

      <SettingsBox
        timeMode={timeMode} setTimeMode={setTimeMode}
        startTime={startTime} setStartTime={setStartTime}
        endTime={endTime} setEndTime={setEndTime}
        workingHoursEnabled={workingHoursEnabled} setWorkingHoursEnabled={setWorkingHoursEnabled}
        postFxSettings={postFxSettings} setPostFxSettings={setPostFxSettings}
      />
    </div>
  );
};

export default LandingPage;
