import React, { useRef, useEffect } from 'react';
import './NewVoiceChat.css';

const SimpleVoiceVisualizer = ({ 
  isRecording, 
  isPlaying, 
  audioAnalyserRef,
  currentAudioLevel = 0
}) => {
  // ... existing code ...

  return (
    <canvas 
      ref={canvasRef} 
      className="nvc-voice-visualizer"
    />
  );
};

export default SimpleVoiceVisualizer; 