import React, { useRef, useEffect, useState } from 'react';
import './WebSocketVoice.css';

// Visualization configuration - centralized customization
// You can adjust these values to change the appearance of the visualization
const visualizationConfig = {
  circle: {
    // Size control - higher values = larger circle (percentage of container)
    sizeRatio: 0.8, // Controls the base size of the circle (0.1 to 1.0)
    innerCircleRatio: 0.6, // Size of inner circle relative to main circle
    
    // Animation
    pulseIntensity: 0.15, // How much the circle pulses (0.1 to 0.5)
    pulseSpeed: 1.5, // Speed of the pulse animation (0.5 to 3.0)
    
    // Ripple effect
    rippleCount: 3, // Number of ripples
    rippleSpeed: 1.2, // Speed of ripple animation
    rippleSize: 0.5, // How large ripples expand (0.2 to 1.0)
    
    // Colors - Recording state (red theme)
    recordingColors: {
      outerStart: 'rgba(255, 120, 120, 0.9)',
      outerMiddle: 'rgba(220, 53, 69, 0.85)',
      outerEnd: 'rgba(160, 30, 45, 0.8)',
      innerStart: 'rgba(255, 160, 160, 0.95)',
      innerEnd: 'rgba(220, 53, 69, 0.2)',
      highlight: 'rgba(255, 200, 200, 0.4)',
      ripple: 'rgba(255, 100, 100, ${opacity})'
    },
    
    // Colors - Playing state (teal theme instead of blue)
    playingColors: {
      outerStart: 'rgba(130, 230, 230, 0.9)',
      outerMiddle: 'rgba(65, 190, 194, 0.85)',
      outerEnd: 'rgba(1, 158, 161, 0.8)',
      innerStart: 'rgba(160, 240, 240, 0.95)',
      innerEnd: 'rgba(1, 158, 161, 0.2)',
      highlight: 'rgba(200, 250, 250, 0.4)',
      ripple: 'rgba(32, 192, 195, ${opacity})'
    },
    
    // Colors - Idle state (teal theme instead of blue)
    idleColors: {
      outerStart: 'rgba(130, 230, 230, 0.9)',
      outerMiddle: 'rgba(65, 190, 194, 0.6)',
      outerEnd: 'rgba(1, 158, 161, 0.3)',
      innerStart: 'rgba(160, 240, 240, 0.7)',
      innerEnd: 'rgba(1, 158, 161, 0.1)',
      highlight: 'rgba(200, 250, 250, 0.3)'
    }
  },
  // Add configurations for other visualization types if needed
  bars: { /* ... */ },
  wave: { /* ... */ }
};

const VoiceVisualization = ({ 
  isRecording, 
  isPlaying, 
  audioAnalyserRef,
  currentAudioLevel,
  mode = 'circle' // 'bars', 'circle', or 'wave'
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [hasActiveAnalyser, setHasActiveAnalyser] = useState(false);
  
  // Update active analyzer state when references change
  useEffect(() => {
    setHasActiveAnalyser(!!audioAnalyserRef?.current);
  }, [audioAnalyserRef]);
  
  // Drawing functions for different visualization types
  const drawVisualizer = (analyser, canvas, dataArray, bufferLength, mode) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Force a square drawing area to ensure circles remain circular
    // Calculate the size of the square within the rectangular canvas
    const size = Math.min(width, height);
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;

    // Draw idle state ONLY when not recording/playing AND no active analyzer/audio data
    if (!isRecording && !isPlaying && !hasActiveAnalyser) {
      drawIdleCircle(ctx, offsetX, offsetY, size);
      return;
    }
    
    if (analyser) {
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
    }
    
    // Choose visualization based on mode
    switch (mode) {
      case 'circle':
        drawCircleVisualizer(ctx, offsetX, offsetY, size, dataArray, bufferLength);
        break;
      case 'wave':
        drawWaveVisualizer(ctx, width, height, dataArray, bufferLength);
        break;
      case 'bars':
      default:
        drawBarsVisualizer(ctx, width, height, dataArray, bufferLength);
        break;
    }
  };

  const drawIdleCircle = (ctx, offsetX, offsetY, size) => {
    const config = visualizationConfig.circle;
    const center = { x: offsetX + size/2, y: offsetY + size/2 };
    const time = Date.now() / 1000;
    const pulse = 1 + Math.sin(time * config.pulseSpeed) * config.pulseIntensity;
    const baseRadius = size * config.sizeRatio / 2;
    const animatedRadius = baseRadius * pulse;
    
    // Create gentle gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      center.x - animatedRadius * 0.2, 
      center.y - animatedRadius * 0.2,
      0,
      center.x,
      center.y,
      animatedRadius * 1.2
    );
    
    const colors = config.idleColors;
    gradient.addColorStop(0, colors.outerStart);
    gradient.addColorStop(0.4, colors.outerMiddle);
    gradient.addColorStop(1, colors.outerEnd);
    
    // Draw the main circle with gradient
    ctx.beginPath();
    ctx.arc(center.x, center.y, animatedRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle highlight for 3D effect
    ctx.beginPath();
    ctx.arc(
      center.x - animatedRadius * 0.15,
      center.y - animatedRadius * 0.15,
      animatedRadius * 0.5,
      Math.PI * 0.9,
      Math.PI * 1.5,
      false
    );
    ctx.strokeStyle = colors.highlight;
    ctx.lineWidth = animatedRadius * 0.08;
    ctx.stroke();
    
    // Add inner circle
    const innerRadius = animatedRadius * config.innerCircleRatio;
    const innerGradient = ctx.createRadialGradient(
      center.x, center.y, 0,
      center.x, center.y, innerRadius
    );
    
    innerGradient.addColorStop(0, colors.innerStart);
    innerGradient.addColorStop(1, colors.innerEnd);
    
    ctx.beginPath();
    ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
  };
  
  const drawBarsVisualizer = (ctx, width, height, dataArray, bufferLength) => {
    // Configuration
    const barCount = 64; // Number of bars
    const barWidth = width / barCount;
    const barGap = 2;
    const scaleFactor = 2.5;
    
    ctx.fillStyle = isRecording ? 'rgba(220, 53, 69, 0.7)' : 'rgba(1, 158, 161, 0.7)';
    
    // Use actual dataArray if available, otherwise simulate with current audio level
    if (dataArray && bufferLength) {
      // For actual frequency data
      const step = Math.floor(bufferLength / barCount);
      
      for (let i = 0; i < barCount; i++) {
        const dataIndex = i * step;
        const value = dataArray[dataIndex];
        const percent = value / 255;
        const barHeight = (percent * height * 0.8) * scaleFactor;
        
        // Center bars vertically
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        
        // Draw bar with rounded corners
        ctx.beginPath();
        ctx.roundRect(x + barGap/2, y, barWidth - barGap, barHeight, 4);
        ctx.fill();
      }
    } else {
      // Simulate visualization based on currentAudioLevel when dataArray not available
      const simulatedLevel = currentAudioLevel / 100 || 0.05;
      
      for (let i = 0; i < barCount; i++) {
        // Create a pattern by varying bar heights
        const angle = (i / barCount) * Math.PI * 2;
        const variation = 0.4 * Math.sin(angle * 3) + 0.6;
        const percent = simulatedLevel * variation;
        
        // Add randomness for more natural look
        const randomFactor = 0.1 * Math.random();
        const finalPercent = isPlaying || isRecording ? 
          percent + randomFactor : 
          0.05 + 0.05 * Math.sin(Date.now() / 200 + i);
        
        const barHeight = finalPercent * height * 0.7;
        
        // Center bars vertically
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        
        // Draw bar
        ctx.beginPath();
        ctx.roundRect(x + barGap/2, y, barWidth - barGap, barHeight, 4);
        ctx.fill();
      }
    }
  };
  
  const drawCircleVisualizer = (ctx, offsetX, offsetY, size, dataArray, bufferLength) => {
    const config = visualizationConfig.circle;
    const center = { x: offsetX + size/2, y: offsetY + size/2 };
    const baseRadius = size * config.sizeRatio / 2;
    
    // Get average amplitude from all frequency data or use currentAudioLevel
    let avgAmplitude;
    if (dataArray && bufferLength) {
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      avgAmplitude = sum / (bufferLength * 255); // Normalize to 0-1
    } else {
      // Simulate with current audio level or gentle pulsing when idle
      avgAmplitude = isPlaying || isRecording ? 
        (currentAudioLevel / 100) || 0.3 : 
        0.2 + 0.1 * Math.sin(Date.now() / 500);
    }
    
    // Apply easing for smoother animation
    const scaleFactor = 0.5 + avgAmplitude * 0.7; // Scale 0.5-1.2x based on amplitude
    const animatedRadius = baseRadius * scaleFactor;
    
    // Create 3D effect with gradient
    const gradient = ctx.createRadialGradient(
      center.x - animatedRadius * 0.2, // Light source offset
      center.y - animatedRadius * 0.2,
      0,
      center.x,
      center.y,
      animatedRadius * 1.2
    );
    
    // Different color schemes for recording vs playing
    const colors = isRecording ? config.recordingColors : config.playingColors;
    
    gradient.addColorStop(0, colors.outerStart);
    gradient.addColorStop(0.4, colors.outerMiddle);
    gradient.addColorStop(1, colors.outerEnd);
    
    // Draw main circle with gradient
    ctx.beginPath();
    ctx.arc(center.x, center.y, animatedRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add highlight reflection (subtle arc at the top-left)
    ctx.beginPath();
    ctx.arc(
      center.x - animatedRadius * 0.2,
      center.y - animatedRadius * 0.2,
      animatedRadius * 0.6,
      Math.PI * 0.9,
      Math.PI * 1.5,
      false
    );
    ctx.strokeStyle = colors.highlight;
    ctx.lineWidth = animatedRadius * 0.12;
    ctx.stroke();
    
    // Add subtle ripple effect (outer circles)
    const time = Date.now() / 1000;
    
    // Only show ripples during recording or playback
    if (isRecording || isPlaying) {
      for (let i = 0; i < config.rippleCount; i++) {
        // Calculate ripple phase offset
        const phaseOffset = i * (Math.PI * 2 / config.rippleCount);
        const ripplePhase = (time * config.rippleSpeed + phaseOffset) % 1; // 1-second cycle
        
        const rippleRadius = animatedRadius * (1 + ripplePhase * config.rippleSize);
        const opacity = 0.3 * (1 - ripplePhase); // Fade out as it expands
        
        ctx.beginPath();
        ctx.arc(center.x, center.y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ripple.replace('${opacity}', opacity.toString());
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    
    // Add a smaller inner circle for depth
    const innerRadius = animatedRadius * config.innerCircleRatio;
    const innerGradient = ctx.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      innerRadius
    );
    
    innerGradient.addColorStop(0, colors.innerStart);
    innerGradient.addColorStop(1, colors.innerEnd);
    
    ctx.beginPath();
    ctx.arc(center.x, center.y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
  };
  
  const drawWaveVisualizer = (ctx, width, height, dataArray, bufferLength) => {
    const centerY = height / 2;
    
    ctx.strokeStyle = isRecording ? 'rgba(220, 53, 69, 0.8)' : 'rgba(1, 158, 161, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Wave visualization
    const sliceWidth = width / (bufferLength || 100);
    let x = 0;
    
    if (dataArray && bufferLength) {
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255;
        const y = value * height * 0.5 + centerY;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
    } else {
      // Simulate with waves when no data
      const simulatedLevel = currentAudioLevel / 100 || 0.1;
      const pointCount = 100;
      
      for (let i = 0; i < pointCount; i++) {
        const percent = i / pointCount;
        const time = Date.now() / 1000;
        
        // Create a complex wave pattern
        const wave1 = Math.sin(percent * 10 + time) * simulatedLevel;
        const wave2 = Math.sin(percent * 20 + time * 0.7) * simulatedLevel * 0.5;
        const wave3 = Math.sin(percent * 5 + time * 1.3) * simulatedLevel * 0.3;
        
        const amplitude = isPlaying || isRecording ? 
          (wave1 + wave2 + wave3) : 
          0.05 * Math.sin(percent * 15 + time * 2);
        
        const y = amplitude * height * 0.4 + centerY;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
    }
    
    ctx.stroke();
  };
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    // Debug log DPR
    console.log('Device Pixel Ratio:', dpr);
    
    // Step 1: Set inline styles on the canvas to make it fill the container
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.display = 'block';
    
    // Step 2: Force container to have explicit dimensions if needed
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.warn('Container has zero width or height, forcing dimensions');
      container.style.width = '100%';
      container.style.height = '300px'; // Updated to match CSS
      container.style.maxWidth = '600px'; // Updated to match CSS
      container.style.margin = '40px auto 50px'; // Updated to match CSS
      container.style.display = 'block';
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.borderRadius = '12px';
      // Removed background color and box-shadow as requested
    }
    
    // Step 3: Get the COMPUTED dimensions of the container AFTER styles are applied
    // Force a reflow if needed to get accurate dimensions
    const displayWidth = Math.floor(container.getBoundingClientRect().width);
    const displayHeight = Math.floor(container.getBoundingClientRect().height);
    
    // Ensure minimum dimensions to prevent zero-width/height issues
    const safeWidth = Math.max(displayWidth, 200);
    const safeHeight = Math.max(displayHeight, 100);
    
    // Debug log to see actual dimensions
    console.log('Voice Visualization dimensions:', {
      container: {
        width: container.clientWidth,
        height: container.clientHeight,
        getBoundingRect: {
          width: displayWidth,
          height: displayHeight
        },
        style: {
          width: container.style.width,
          height: container.style.height
        }
      },
      canvas: {
        originalWidth: canvas.width,
        originalHeight: canvas.height,
        newWidth: safeWidth * dpr,
        newHeight: safeHeight * dpr,
        style: {
          width: canvas.style.width,
          height: canvas.style.height
        }
      },
      dpr: dpr
    });
    
    // Step 4: Set the canvas size attributes accounting for device pixel ratio
    // Add a maximum size limit to prevent excessive canvas dimensions
    const MAX_CANVAS_WIDTH = 800;
    const MAX_CANVAS_HEIGHT = 800;
    
    // Calculate the final canvas dimensions with device pixel ratio 
    // but cap at maximum limits
    const finalWidth = Math.min(safeWidth * dpr, MAX_CANVAS_WIDTH);
    const finalHeight = Math.min(safeHeight * dpr, MAX_CANVAS_HEIGHT);
    
    // Set the canvas dimensions
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // Step 5: Scale the context to counter the increased canvas size
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    let analyser = null;
    let dataArray = null;
    let bufferLength = null;
    
    if (audioAnalyserRef?.current) {
      analyser = audioAnalyserRef.current;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }
    
    // Animation loop
    const animate = () => {
      drawVisualizer(analyser, canvas, dataArray, bufferLength, mode);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPlaying, audioAnalyserRef, currentAudioLevel, mode]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="voice-visualization"
    />
  );
};

// Export the visualization config to make it accessible
export { visualizationConfig };
export default VoiceVisualization; 