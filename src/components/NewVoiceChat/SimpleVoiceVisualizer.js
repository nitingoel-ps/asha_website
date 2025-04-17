import React, { useRef, useEffect } from 'react';
import './NewVoiceChat.css';

const SimpleVoiceVisualizer = ({ 
  isRecording, 
  isPlaying, 
  audioAnalyserRef,
  currentAudioLevel = 0
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Colors configuration
  const colors = {
    recording: {
      primary: '#dc3545',      // Red
      secondary: '#ff8f9d',    // Light red
      accent: '#9e1c28'        // Dark red
    },
    playing: {
      primary: '#019ea1',      // Teal
      secondary: '#5ddadc',    // Light teal
      accent: '#017374'        // Dark teal
    },
    idle: {
      primary: '#6c757d',      // Gray
      secondary: '#adb5bd',    // Light gray
      accent: '#495057'        // Dark gray
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    // Set up the canvas to fill its container
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;
      
      // Ensure the canvas has a minimum size
      const width = Math.max(displayWidth, 100);
      const height = Math.max(displayHeight, 100);
      
      // Set canvas dimensions accounting for device pixel ratio
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Scale the context to counter the increased canvas size
      ctx.scale(dpr, dpr);
      
      // Set dimensions with CSS
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    
    // Initial resize
    resize();
    
    // Set up animation function based on state
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw based on current state
      if (isRecording) {
        drawRecordingVisualization(ctx, canvas, currentAudioLevel);
      } else if (isPlaying) {
        drawPlayingVisualization(ctx, canvas, audioAnalyserRef);
      } else {
        drawIdleVisualization(ctx, canvas);
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Handle window resize
    window.addEventListener('resize', resize);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, isPlaying, audioAnalyserRef, currentAudioLevel]);

  // Drawing functions
  const drawRecordingVisualization = (ctx, canvas, level) => {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get color theme
    const colorSet = colors.recording;
    
    // Calculate radius based on audio level and animation
    const baseRadius = Math.min(width, height) * 0.35;
    
    // Enhanced pulsing animation - more pronounced
    const time = Date.now() / 1000;
    const pulseAmount = Math.sin(time * 3) * 0.15; // Faster and larger pulse
    
    // Add audio level influence (0-100) - with stronger effect
    const levelInfluence = Math.max(0.1, level / 100 * 0.5); // Minimum 10% influence for visibility
    
    // Calculate final radius with pulse and audio level
    const radius = baseRadius * (1 + pulseAmount + levelInfluence);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.5,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, colorSet.secondary);
    gradient.addColorStop(0.7, colorSet.primary);
    gradient.addColorStop(1, colorSet.accent);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw inner circle
    const innerRadius = radius * 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    
    // Create inner gradient
    const innerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, innerRadius
    );
    innerGradient.addColorStop(0, colorSet.secondary);
    innerGradient.addColorStop(1, colorSet.primary);
    
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // Always draw ripple effect - even with low audio levels
    const rippleCount = 3;
    for (let i = 0; i < rippleCount; i++) {
      const ripplePhase = (Date.now() / 1000 + i * 0.33) % 1;
      const rippleRadius = radius * (1 + ripplePhase * 0.5);
      
      // Make ripples more visible
      const rippleOpacity = Math.max(0.2, 0.6 * (1 - ripplePhase) * (level / 100 + 0.5));
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${parseInt(colorSet.primary.slice(1, 3), 16)}, ${parseInt(colorSet.primary.slice(3, 5), 16)}, ${parseInt(colorSet.primary.slice(5, 7), 16)}, ${rippleOpacity})`;
      ctx.lineWidth = 3; // Thicker lines for visibility
      ctx.stroke();
    }
  };

  const drawPlayingVisualization = (ctx, canvas, analyserRef) => {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get color theme
    const colorSet = colors.playing;
    
    // Use analyser data if available
    let dataArray, bufferLength;
    if (analyserRef?.current) {
      bufferLength = analyserRef.current.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
    }
    
    // Calculate average level from analyzer or use animation
    let level = 0;
    if (dataArray && bufferLength) {
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      level = Math.min(100, Math.round((sum / bufferLength / 255) * 100));
      
      // Enhance the level to make visualization more obvious
      level = Math.max(15, level); // Minimum 15% level for visibility
    } else {
      // Simulate with animation if no analyzer data
      const time = Date.now() / 1000;
      level = 20 + Math.sin(time * 2) * 15; // Oscillate between 5-35
    }
    
    // Calculate radius based on audio level and animation
    const baseRadius = Math.min(width, height) * 0.35;
    
    // Use same pulsing animation as recording (just with different timing)
    const time = Date.now() / 1000;
    const pulseAmount = Math.sin(time * 3) * 0.15; // Faster and larger pulse
    
    // Add audio level influence (0-100) - with stronger effect
    const levelInfluence = Math.max(0.1, level / 100 * 0.5); // Minimum 10% influence for visibility
    
    // Calculate final radius with pulse and audio level
    const radius = baseRadius * (1 + pulseAmount + levelInfluence);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.5,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, colorSet.secondary);
    gradient.addColorStop(0.7, colorSet.primary);
    gradient.addColorStop(1, colorSet.accent);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw inner circle
    const innerRadius = radius * 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    
    // Create inner gradient
    const innerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, innerRadius
    );
    innerGradient.addColorStop(0, colorSet.secondary);
    innerGradient.addColorStop(1, colorSet.primary);
    
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // Always draw ripple effect - even with low audio levels
    const rippleCount = 3;
    for (let i = 0; i < rippleCount; i++) {
      const ripplePhase = (Date.now() / 1000 + i * 0.33) % 1;
      const rippleRadius = radius * (1 + ripplePhase * 0.5);
      
      // Make ripples more visible
      const rippleOpacity = Math.max(0.2, 0.6 * (1 - ripplePhase) * (level / 100 + 0.5));
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${parseInt(colorSet.primary.slice(1, 3), 16)}, ${parseInt(colorSet.primary.slice(3, 5), 16)}, ${parseInt(colorSet.primary.slice(5, 7), 16)}, ${rippleOpacity})`;
      ctx.lineWidth = 3; // Thicker lines for visibility
      ctx.stroke();
    }
  };

  const drawIdleVisualization = (ctx, canvas) => {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Get color theme
    const colorSet = colors.idle;
    
    // Create subtle pulsing animation
    const time = Date.now() / 1000;
    const pulseAmount = Math.sin(time * 0.5) * 0.05;
    
    // Calculate radius with subtle pulse
    const baseRadius = Math.min(width, height) * 0.35;
    const radius = baseRadius * (1 + pulseAmount);
    
    // Draw main circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    // Create gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.5,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, colorSet.secondary);
    gradient.addColorStop(0.7, colorSet.primary);
    gradient.addColorStop(1, colorSet.accent);
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw subtle inner circle
    const innerRadius = radius * 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    
    const innerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, innerRadius
    );
    innerGradient.addColorStop(0, colorSet.secondary);
    innerGradient.addColorStop(1, colorSet.primary);
    
    ctx.fillStyle = innerGradient;
    ctx.fill();
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="voice-visualizer"
    />
  );
};

export default SimpleVoiceVisualizer; 