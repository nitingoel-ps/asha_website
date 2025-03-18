import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Spinner, Alert } from 'react-bootstrap';
import { Mic, Square, X, Pause, Play, Keyboard } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AIVoice.css';
import { fetchWithAuth } from "../../utils/fetchWithAuth";

const AIVoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isStreamComplete, setIsStreamComplete] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false); // New state for autoplay failures

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Refs for audio playback
  const audioElementRef = useRef(null);
  const audioBuffersRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const pendingChunksRef = useRef([]);
  
  // Add ref for tracking stream state
  const isStreamCompleteRef = useRef(false);
  const isCancelledRef = useRef(false);
  const lastAudioUpdateRef = useRef(Date.now());

  // Add new refs for request handling
  const isSubmittingRef = useRef(false);
  const currentRequestControllerRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const isPlaybackCompleteRef = useRef(false);
  const userInteractionContextRef = useRef(null);
  const autoplayFailedRef = useRef(false); // New ref for tracking autoplay failures in callbacks

  // Add new ref to store all received chunks for replay from beginning
  const allAudioChunksUrlsRef = useRef([]);

  const initializeAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Function to queue and play audio chunks
  const queueAndPlayAudio = async (arrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        await initializeAudioContext();
      }
      
      // Create an audio element to play the chunk directly
      const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Store this URL in our complete list for potential replay from beginning
      allAudioChunksUrlsRef.current.push(audioUrl);
      
      if (!audioBuffersRef.current.audio) {
        const audio = new Audio();
        audio.onended = () => {
          // Clean up the URL when done
          URL.revokeObjectURL(audioUrl);
          
          // Play next chunk if available
          if (pendingChunksRef.current.length > 0) {
            const nextChunkUrl = pendingChunksRef.current.shift();
            audioBuffersRef.current.audio.src = nextChunkUrl;
            audioBuffersRef.current.audio.play().catch(e => console.warn('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
            if (isStreamCompleteRef.current) {
              handlePlaybackComplete();
            }
          }
        };
        
        audio.onerror = (e) => {
          console.warn('Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          
          // Try next chunk
          if (pendingChunksRef.current.length > 0) {
            const nextChunkUrl = pendingChunksRef.current.shift();
            audio.src = nextChunkUrl;
            audio.play().catch(e => console.warn('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
          }
        };
        
        audioBuffersRef.current.audio = audio;
      }
      
      // If we're currently playing, queue this chunk
      if (isPlayingRef.current) {
        pendingChunksRef.current.push(audioUrl);
      } else {
        // Otherwise play it immediately
        isPlayingRef.current = true;
        audioBuffersRef.current.audio.src = audioUrl;
        await audioBuffersRef.current.audio.play().catch(e => {
          console.warn('Error starting audio playback:', e);
          // Set autoplay failed flags
          autoplayFailedRef.current = true;
          setAutoplayFailed(true);
          
          // Don't add to pendingChunks here anymore - we'll use allAudioChunksUrlsRef for complete playback
          isPlayingRef.current = false;
        });
      }
      
      // Update UI state only if autoplay hasn't failed
      if (!autoplayFailedRef.current) {
        if (!isPlaying) {
          setIsPlaying(true);
          setIsProcessing(false);
        }
      } else {
        // Just hide processing indicator when autoplay fails
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('Error queuing audio:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      });
      
      // If all else fails, at least play a beep
      playBeepSound();
    }
  };
  
  // Play a simple beep sound as placeholder for audio chunks on unsupported browsers
  const playBeepSound = () => {
    try {
      // Create an oscillator for a simple beep sound
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime); // Low volume
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      // Short beep
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.2);
    } catch (error) {
      console.warn('Error playing beep sound:', error);
    }
  };

  // Pause playback function
  const pausePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.pause();
      isPlayingRef.current = false;
    }
  };

  // Resume playback function
  const resumePlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.play()
        .catch(e => console.warn('Error resuming playback:', e));
      isPlayingRef.current = true;
    } else if (pendingChunksRef.current.length > 0) {
      const nextChunkUrl = pendingChunksRef.current.shift();
      if (!audioBuffersRef.current.audio) {
        audioBuffersRef.current.audio = new Audio();
      }
      audioBuffersRef.current.audio.src = nextChunkUrl;
      audioBuffersRef.current.audio.play()
        .catch(e => console.warn('Error resuming playback:', e));
      isPlayingRef.current = true;
    }
  };

  // Stop playback function
  const stopPlayback = () => {
    if (audioBuffersRef.current.audio) {
      audioBuffersRef.current.audio.pause();
      audioBuffersRef.current.audio.src = '';
    }
    
    // Clean up any pending URLs
    pendingChunksRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    pendingChunksRef.current = [];
    isPlayingRef.current = false;
    audioBuffersRef.current = {};
  };

  const handlePlaybackComplete = () => {
    console.log('Playback completed');
    isPlaybackCompleteRef.current = true;
    
    // Don't auto cleanup if we're in autoplay failed state
    if (!autoplayFailedRef.current) {
      cleanupStates(true);
      setTimeout(() => cleanupAudio(false), 100);
    } else {
      console.log('Skipping auto cleanup due to autoplay failed state');
    }
  };

  const cleanupAudio = (preserveRequest = false) => {
    try {
      console.log('Entered cleanupAudio:', {
        preserveRequest,
        currentStates: {
          isStreamComplete: isStreamCompleteRef.current,
          isPlaybackComplete: isPlaybackCompleteRef.current,
          isSubmitting: isSubmittingRef.current,
          autoplayFailed: autoplayFailedRef.current
        }
      });
      
      // Don't cleanup if we're in autoplay failed state unless explicitly stopping
      if (autoplayFailedRef.current && preserveRequest) {
        console.log('Skipping cleanup due to autoplay failed state');
        return;
      }
      
      // Only cleanup if playback is complete or we're explicitly not preserving the request
      if (isPlaybackCompleteRef.current || !preserveRequest) {
        if (currentRequestControllerRef.current && !isStreamCompleteRef.current) {
          currentRequestControllerRef.current.abort();
        }
        currentRequestControllerRef.current = null;
        isSubmittingRef.current = false;

        // Cleanup audio elements
        stopPlayback();

        // Clean up all stored URL objects
        allAudioChunksUrlsRef.current.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        allAudioChunksUrlsRef.current = [];

        // Reset states
        isStreamCompleteRef.current = false;
        isPlaybackCompleteRef.current = false;
        setIsStreamComplete(false);
        setAutoplayFailed(false);
        autoplayFailedRef.current = false;
      }
    } catch (error) {
      console.warn('Non-critical cleanup error:', error);
    }
  };

  const handleAudioChunk = async (arrayBuffer) => {
    lastAudioUpdateRef.current = Date.now();
    console.log('Received audio chunk:', arrayBuffer.byteLength);
    
    // Process with unified Web Audio API approach
    await queueAndPlayAudio(arrayBuffer);

    if (!isPlaying) {
      setIsPlaying(true);
      setIsProcessing(false);
    }
  };

  const handleAudioStream = async (response) => {
    let reader;
    try {
      console.log("Entered handleAudioStream");
      isTransitioningRef.current = true;
      isPlaybackCompleteRef.current = false;
      
      // Only clean up old audio resources if we're not in autoplay failed state
      if (!autoplayFailedRef.current) {
        // Clean up old audio resources but preserve the request
        cleanupAudio(true);
      }
      
      // Reset the stored URLs for this new stream only if not in autoplay failed state
      if (!autoplayFailedRef.current) {
        allAudioChunksUrlsRef.current = [];
      }
      
      // Initialize audio context for Web Audio API
      await initializeAudioContext();
      // Reset audio state only if not in autoplay failed state
      if (!autoplayFailedRef.current) {
        pendingChunksRef.current = [];
        audioBuffersRef.current = {};
        isPlayingRef.current = false;
      }
      
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      isTransitioningRef.current = false;

      while (true) {
        if (isCancelledRef.current || isPlaybackCompleteRef.current) {
          break;
        }

        const { value, done } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          isStreamCompleteRef.current = true;
          setIsStreamComplete(true);
          setIsProcessing(false);
          
          if (!isPlayingRef.current && pendingChunksRef.current.length === 0 && !autoplayFailedRef.current) {
            handlePlaybackComplete();
          }
          break;
        }

        const chunk = decoder.decode(value);
        buffer += chunk;

        const chunks = buffer.split('\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          if (chunk.trim()) {
            try {
              const audioData = atob(chunk);
              const arrayBuffer = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                arrayBuffer[i] = audioData.charCodeAt(i);
              }
              await handleAudioChunk(arrayBuffer.buffer);
            } catch (error) {
              console.error('Error processing chunk:', error);
            }
          }
        }
      }
    } catch (error) {
      if (isTransitioningRef.current) {
        console.log('Stream cleanup during transition - ignoring error:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          details: error
        });
        return;
      }
      if (error.name === 'AbortError' && isStreamCompleteRef.current) {
        return;
      }
      console.error('Error processing audio stream:', error);
      setError('Error processing audio stream');
      setIsProcessing(false);
    } finally {
      isTransitioningRef.current = false;
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          console.warn('Non-critical: Error canceling reader:', e);
        }
      }
    }
  };

  const handleSend = async () => {
    if (!mediaRecorderRef.current || !isRecording || isSubmittingRef.current) {
      return;
    }

    try {
      // Save the user interaction context for audio playback
      userInteractionContextRef.current = true;
      isSubmittingRef.current = true;

      // Cancel any existing request
      if (currentRequestControllerRef.current) {
        currentRequestControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const controller = new AbortController();
      currentRequestControllerRef.current = controller;

      // Initialize audio context with user gesture
      await initializeAudioContext();
      
      isCancelledRef.current = false;
      
      // MODIFIED: Instead of stopping immediately, add a small delay to capture final audio
      setIsProcessing(true);
      
      // First, get reference to the recorder
      const recorder = mediaRecorderRef.current;
      
      // Request one final chunk immediately before stopping
      if (recorder && recorder.state === 'recording') {
        recorder.requestData();
      }
      
      // Add a small delay before stopping to ensure the last audio is captured
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Now stop the recorder after the delay
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        recorder.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);

      if (audioChunksRef.current.length === 0) {
        console.warn('No audio recorded');
        setIsProcessing(false);
        isSubmittingRef.current = false;
        return;
      }

      // Get the actual MIME type used in recording
      const actualType = audioChunksRef.current[0]?.type || 'audio/webm';
      console.log('Actual recorded audio MIME type:', actualType);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      console.log('Calling /streaming-voice-chat/ - Sending audio to server');
      const response = await fetchWithAuth('/streaming-voice-chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Audio.split(',')[1],
          stream: true,
          audio_format: actualType, // Send the format info to the server
          session_id: sessionId // Include session_id if it exists
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok (${response.status})`);
      }

      await handleAudioStream(response);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Error sending audio:', error);
      setError('Error sending audio: ' + error.message);
      setIsProcessing(false);
    } finally {
      isSubmittingRef.current = false;
      currentRequestControllerRef.current = null;
    }
  };

  const startRecording = async () => {
    console.log('Starting recording');
    // Reset cancellation flag
    isCancelledRef.current = false;
    
    // Clear any existing errors first
    setError(null);
    
    try {
      // Save the user interaction context
      userInteractionContextRef.current = true;
      
      // Initialize AudioContext first - critical to do this in user gesture handler
      await initializeAudioContext();
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Stop any active recording first
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => {};
            mediaRecorderRef.current.ondataavailable = () => {};
            mediaRecorderRef.current.stop();
          }
          const tracks = mediaRecorderRef.current.stream.getTracks();
          tracks.forEach(track => track.stop());
          mediaRecorderRef.current = null;
        } catch (e) {
          console.warn('Error cleaning up previous recording:', e);
        }
      }
      
      // Clean up any existing audio resources
      try {
        cleanupAudio();
      } catch (err) {
        console.warn('Non-critical error cleaning up before recording:', err);
      }
      
      // Reset UI states
      setIsPlaying(false);
      setIsPaused(false);
      
      // Reset audio chunks
      audioChunksRef.current = [];

      // Now resume AudioContext if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed successfully');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get the supported MIME type based on browser compatibility
      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType);
      
      // Start with minimal options to ensure broader compatibility
      const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : undefined;
      
      // Create a new MediaRecorder instance
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Failed to create MediaRecorder with options, trying without options:', e);
        recorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = recorder;
      
      // Ensure audio chunks array is empty before starting
      audioChunksRef.current = [];

      // Set up the data available event handler
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log(`Adding audio chunk: ${event.data.size} bytes, type: ${event.data.type}`);
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up the stop event handler
      recorder.onstop = async () => {
        console.log('MediaRecorder stopped, chunks collected:', audioChunksRef.current.length);
        
        try {
          // Check cancellation flag before proceeding
          if (isCancelledRef.current) {
            console.log('Recording was cancelled, skipping sending to server');
            setIsProcessing(false);
            return;
          }
          
          // Log the current audio chunks
          console.log(`recorder.onstop: Collected ${audioChunksRef.current.length} audio chunks`);
          
          // If we're canceling (no chunks), just clean up
          if (!audioChunksRef.current.length) {
            console.warn('No audio chunks recorded - likely canceled');
            setIsRecording(false);
            setIsProcessing(false);
            return;
          }
          // Don't make API call here - that will happen in handleSend()
          setIsRecording(false);

        } catch (error) {
          console.error('Error processing recording:', error);
          setError('Error processing recording: ' + (error.message || 'Unknown error'));
          setIsProcessing(false);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error: ' + (event.error?.message || 'Unknown error'));
        setIsRecording(false);
        setIsProcessing(false);
      };

      // MODIFIED: Start recording with a shorter timeslice to get more frequent chunks
      setTimeout(() => {
        try {
          recorder.start(500); // Request data every 500ms for more granular chunks
          setIsRecording(true);
          console.log('MediaRecorder started with timeslice 500ms');
        } catch (err) {
          console.error('Error starting recording:', err);
          setError('Error starting recording: ' + err.message);
        }
      }, 100);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone: ' + err.message);
    }
  };

  // Helper function to check supported MIME types
  const getSupportedMimeType = () => {
    // List of MIME types to try in order of preference
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/aac'
    ];

    for (const type of mimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          console.log(`Browser supports MIME type: ${type}`);
          return type;
        }
      } catch (e) {
        console.warn(`Error checking support for ${type}:`, e);
      }
    }

    // If we get here, no MIME type is explicitly supported
    // Return undefined to let the browser use its default
    console.log('No specified MIME type supported, using browser default');
    return undefined;
  };

  const handleCancel = () => {
    console.log('Canceling recording');
    
    // Set cancellation flag FIRST - this is crucial
    isCancelledRef.current = true;
    
    // Clear any existing errors
    setError(null);
    
    // Reset states first - before any async operations
    setIsRecording(false);
    setIsPlaying(false);
    setIsProcessing(false);
    setIsPaused(false);
    
    // Clear audio chunks FIRST to ensure no data is sent even if handlers still fire
    audioChunksRef.current = [];
    
    if (mediaRecorderRef.current) {
      try {
        // Important: Remove the onstop handler completely before stopping
        // This ensures we don't trigger data sending when canceling
        const recorder = mediaRecorderRef.current;
        recorder.onstop = null;  // Remove the handler completely
        recorder.ondataavailable = null;  // Remove data handler too
        
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
            console.log('MediaRecorder stopped');
          } catch (e) {
            console.warn('Error stopping media recorder:', e);
          }
        }
        
        // Always stop all tracks
        const tracks = recorder.stream.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
        
        // Explicitly set to null to free memory
        mediaRecorderRef.current = null;
      } catch (error) {
        console.warn('Error stopping media recorder tracks:', error);
      }
    }
    
    // Complete audio cleanup after a short delay to avoid state conflicts
    setTimeout(() => {
      try {
        cleanupAudio();
        console.log('Recording canceled and states reset');
      } catch (error) {
        console.warn('Non-critical cleanup error:', error);
      }
    }, 100);
  };

  const cleanupStates = (includePlayback = true) => {
    console.log('Cleaning up states:', {
      includePlayback,
      currentStates: {
        isPlaying,
        isPaused,
        isProcessing
      }
    });

    if (includePlayback) {
      setIsPlaying(false);
      setIsPaused(false);
    }
    setIsProcessing(false);
  };

  // Update pause/resume handlers for playback
  const handlePausePlayback = () => {
    pausePlayback();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleResumePlayback = () => {
    resumePlayback();
    setIsPaused(false);
    setIsPlaying(true);
  };

  // Renamed from stopAllPlayback to match its invocation in the render method
  const stopAllPlayback = () => {
    cleanupAudio();
    setIsPlaying(false);
    setIsPaused(false);
  };

  // New function to manually start playback after autoplay fails
  const startManualPlayback = () => {
    // If autoplay failed, we should play from the beginning using all stored chunks
    if (allAudioChunksUrlsRef.current.length > 0 && !isPlayingRef.current) {
      // Clear any existing pending chunks to avoid duplicate playback
      pendingChunksRef.current = [];
      
      // Create a copy of all URLs to avoid modifying the original array
      const allUrls = [...allAudioChunksUrlsRef.current];
      
      // Get the first URL and queue the rest
      const firstUrl = allUrls.shift();
      pendingChunksRef.current = allUrls;
      
      if (!audioBuffersRef.current.audio) {
        audioBuffersRef.current.audio = new Audio();
        
        audioBuffersRef.current.audio.onended = () => {
          if (pendingChunksRef.current.length > 0) {
            const nextUrl = pendingChunksRef.current.shift();
            audioBuffersRef.current.audio.src = nextUrl;
            audioBuffersRef.current.audio.play().catch(e => console.warn('Error playing next chunk:', e));
          } else {
            isPlayingRef.current = false;
            if (isStreamCompleteRef.current) {
              handlePlaybackComplete();
            }
          }
        };
      }
      
      audioBuffersRef.current.audio.src = firstUrl;
      audioBuffersRef.current.audio.play()
        .then(() => {
          // Update state on successful manual playback
          isPlayingRef.current = true;
          setAutoplayFailed(false);
          autoplayFailedRef.current = false;
          setIsPlaying(true);
        })
        .catch(e => {
          console.warn('Manual playback also failed:', e);
          setError('Could not play audio. Your browser may have strict autoplay policies.');
        });
    }
  };

  const handleNavigateToTextChat = () => {
    // If we have a session ID, navigate to that specific chat
    if (sessionId) {
      navigate(`/ai-chat/${sessionId}`);
    } else {
      navigate('/ai-chat');
    }
  };

  // Component cleanup
  useEffect(() => {
    return () => {
      isPlaybackCompleteRef.current = true;
      if (currentRequestControllerRef.current) {
        currentRequestControllerRef.current.abort();
      }
      cleanupAudio(false);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="streaming-voice-interface-container">
      <Card className="streaming-voice-interface">
        <div className="top-icon">
          <Button variant="link" onClick={handleNavigateToTextChat}>
            <Keyboard size={24} />
          </Button>
        </div>
        <Card.Body>
          <div className="main-content-container">
            {/* Error messages container */}
            {(error || autoplayFailed) && (
              <div className="error-container">
                {error && (
                  <div className="error-message alert alert-danger">
                    {error}
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => setError(null)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                )}

                {/* Display autoplay failure warning */}
                {autoplayFailed && (
                  <Alert variant="warning" className="autoplay-warning">
                    Automatic playback failed. Please click Play to hear the response.
                  </Alert>
                )}
              </div>
            )}
            
            <div className="voice-controls">
              {!isRecording && !isProcessing && !isPlaying && !isPaused && !autoplayFailed && (
                <Button 
                  variant="primary" 
                  className="record-button"
                  onClick={startRecording}
                >
                  <Mic size={20} /> Click to speak
                </Button>
              )}

              {isRecording && (
                <div className="recording-controls">
                  <div className="recording-buttons">
                    <Button 
                      variant="success" 
                      className="send-button"
                      onClick={handleSend}
                    >
                      Send
                    </Button>
                    <Button 
                      variant="danger" 
                      className="cancel-button"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="recording-indicator">
                    Recording... <span className="pulse"></span>
                  </div>
                </div>
              )}

              {isProcessing && !isPlaying && !isPaused && !autoplayFailed && (
                <div className="streaming-indicator">
                  <Spinner animation="border" size="sm" />
                  Processing...
                </div>
              )}

              {/* Playback controls */}
              {(isPlaying || isPaused || autoplayFailed) && (
                <div className="voice-playback">
                  <div className="voice-playback__controls">
                    {isPaused || autoplayFailed ? (
                      <Button 
                        className="voice-playback__button"
                        onClick={autoplayFailed ? startManualPlayback : handleResumePlayback}
                      >
                        <Play size={20} />
                      </Button>
                    ) : (
                      <Button 
                        className="voice-playback__button"
                        onClick={handlePausePlayback}
                      >
                        <Pause size={20} />
                      </Button>
                    )}
                    <Button 
                      className="voice-playback__button voice-playback__button--stop"
                      onClick={stopAllPlayback}
                    >
                      <Square size={20} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AIVoice;
